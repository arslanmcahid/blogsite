# Yedekten geri yükleme

Veritabanı (dikkat: mevcut veriyi siler ve yedektekiyle değiştirir):

```bash
cd deploy
docker compose -f docker-compose.prod.yml stop blogsite-api blogsite-web
gunzip -c ~/backups/blogsite/db-YYYYMMDD-HHMMSS.sql.gz | docker compose -f docker-compose.prod.yml exec -T blogsite-db psql -U blog -d blog
docker compose -f docker-compose.prod.yml start blogsite-api blogsite-web
```

Görseller:

```bash
docker run --rm -v blogsite-prod_media:/media -v ~/backups/blogsite:/in alpine sh -c "cd /media && tar xzf /in/media-YYYYMMDD-HHMMSS.tar.gz"
```

Yedeklerin sunucu dışında bir kopyası da olsun (kendi bilgisayarına `scp` ile çek).
