# Sunucuya kurulum (mevcut Caddy'nin arkasına)

Sunucuda zaten Docker ile çalışan bir **Caddy** var (travel-blog projesinin compose'unda). Bu blog onun
**yanına** kurulur: kendi Caddy'sini getirmez, 80/443 portlarını açmaz. Caddy, alan adına göre
istekleri bu bloga yönlendirir. Diğer projeye (travel-blog) **sadece Caddyfile'a bir blok eklenir**.

```
İnternet → Caddy (80/443) ─┬─ travel-blog alan adı → client / server (mevcut)
                           └─ blog alan adı ─┬─ /api, /media → blogsite-api (Django)
                                             └─ diğer her şey → blogsite-web (Next.js)
                                  blogsite-db (Postgres) yalnızca iç ağda
```

## 0) Ön hazırlık (bir kez)

1. **DNS (Cloudflare):** `yazdedik.com` için kayıtlar. Dashboard → alan adı → DNS → Records:
   - `A` · Name: `@` · Content: sunucunun IP'si · Proxy status: **DNS only (gri bulut)**
   - `CNAME` · Name: `www` · Content: `yazdedik.com` · Proxy status: **DNS only (gri bulut)**

   Önce gri bulutla başla: Caddy'nin Let's Encrypt sertifikasını sorunsuz alması için. Site çalıştıktan sonra
   istersen turuncu buluta (Cloudflare proxy) geçebilirsin; o zaman SSL/TLS modunu **Full (strict)** yap,
   yoksa sonsuz yönlendirme döngüsü olur. Kontrol: `dig +short yazdedik.com` sunucunun IP'sini göstermeli.
2. **Bellek:** Sunucuda takas (swap) yok ve RAM 4 GB civarı. Derleme sırasında yetmezse sistem donabilir; 2 GB swap ekle:
   ```bash
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
3. **Güvenlik duvarı:** yalnızca 22, 80 ve 443 dışarıya açık olmalı (`sudo ufw status`).

## 1) Kodu sunucuya al

```bash
git clone https://github.com/arslanmcahid/blogsite.git ~/blogsite
cd ~/blogsite/deploy
cp .env.example .env
```

`.env` dosyasını doldur: `DOMAIN`, ve iki gizli değer (`openssl rand -base64 48` ile üret):

```bash
nano .env
```

Caddy ağının adını doğrula (`PROXY_NETWORK` ile aynı olmalı):

```bash
docker network ls
```

## 2) Derle ve başlat

Derlemeyi tek tek yap (RAM'i zorlamasın):

```bash
docker compose -f docker-compose.prod.yml build blogsite-api
docker compose -f docker-compose.prod.yml build blogsite-web
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

İlk açılışta Django veritabanı tablolarını kendisi oluşturur. Yönetici hesabını oluştur:

```bash
docker compose -f docker-compose.prod.yml exec blogsite-api python manage.py createsuperuser
```

(Kullanıcı adı ve güçlü bir parola sorar. Bu hesapla `https://yazdedik.com/admin` paneline girersin.)

## 3) Caddy'ye blogu tanıt (diğer projeye dokunan tek adım)

Caddy'nin yapılandırması travel-blog deposundaki `infra/Caddyfile` dosyasıdır ve konteynere
`./Caddyfile` olarak bağlanır. `deploy/caddy/blogsite.caddy` içindeki bloğu, (alan adı hazır: `yazdedik.com`) o dosyanın **sonuna** ekle. Sonra Caddy'yi yeniden yapılandır (kesinti olmaz):

```bash
docker exec travel-blog-caddy-1 caddy validate --config /etc/caddy/Caddyfile
docker exec travel-blog-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

> **Önemli:** travel-blog projesi Jenkins ile yeniden dağıtılıyorsa, Caddyfile'ı oradaki depodan
> yeniden yazar ve bu blok silinir. Bloğu **o deponun `infra/Caddyfile` dosyasına da işleyip commit et**.
> Daha temiz bir yol: o Caddyfile'a `import /etc/caddy/sites/*.caddy` satırı ve compose'a
> `/home/deploy/caddy-sites:/etc/caddy/sites:ro` bağlantısı ekleyip blogun bloğunu o klasördeki
> `blogsite.caddy` dosyasında tutmak. Böylece iki proje birbirinden ayrılır.

Birkaç saniye sonra Let's Encrypt sertifikası otomatik alınır. Kontrol:

```bash
curl -I https://yazdedik.com/api/health/
```

## 4) Yedekleme

```bash
chmod +x backup.sh && ./backup.sh
crontab -e   # her gece 03:30'da yedek için aşağıdaki satırı ekle
# 30 3 * * * /home/deploy/blogsite/deploy/backup.sh >> /home/deploy/backups/blogsite/backup.log 2>&1
```

Geri yükleme: `restore.md`. Yedeklerin bir kopyasını sunucu dışına da al.

## 5) Güncelleme (yeni sürüm yayınlama)

```bash
cd ~/blogsite && git pull
cd deploy
docker compose -f docker-compose.prod.yml build blogsite-api
docker compose -f docker-compose.prod.yml build blogsite-web
docker compose -f docker-compose.prod.yml up -d
```

Veritabanı değişiklikleri (migrate) backend açılırken kendiliğinden uygulanır. Önce `./backup.sh` çalıştırmak iyi alışkanlıktır.

## Sorun giderme

| Belirti | Bak |
|---|---|
| Site açılmıyor / sertifika yok | `docker logs travel-blog-caddy-1 --tail 50` (DNS henüz yayılmamış olabilir) |
| 502 Bad Gateway | `docker compose -f docker-compose.prod.yml ps` ve `logs blogsite-web blogsite-api` |
| Girişte "CSRF" hatası | `.env`'deki `DOMAIN` doğru mu, `https://` ile mi giriyorsun |
| Görseller yüklenmiyor | `docker compose ... logs blogsite-api`; Caddy bloğunda `request_body max_size` var mı |
| Bellek bitti | `free -h`, `docker stats --no-stream` |
