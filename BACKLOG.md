# Backlog

Şimdilik yapılmayacak, ileride değerlendirilecek işler. Öncelik sırası yok; yapılınca buradan silinir.

## RSS (`/feed.xml`) ile otomasyon
Feed şu an pasif: sitedeki hiçbir kod kendi feed'ini okumuyor, sadece dışarıdan RSS okuyucular ve botlar çekiyor.
İleride yeni yazıları otomatik dağıtmak için `https://yazdedik.com/feed.xml` adresi bir dış servise verilebilir (sunucuda kod yazmak gerekmez):
- Yeni yazıyı otomatik paylaşma: IFTTT / Zapier / Make ile X, LinkedIn, Telegram kanalı, Discord.
- E-posta bülteni: Buttondown, MailerLite gibi servisler feed'i okuyup aboneleri e-postayla bilgilendirir.
- Telegram botu ile yeni yazı bildirimi.

Notlar:
- Feed'e yalnızca yayında olan yazılar girer, taslaklar girmez.
- Hesap açma ve servisleri bağlama kullanıcının kendi hesaplarında yapılır.
- Küçük bir iyileştirme fikri: sayfa altındaki "RSS" bağlantısını daha anlaşılır yapmak (örn. "Yazıları takip et (RSS)").
