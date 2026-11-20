"""Geliştirme için örnek içerik üretir: python manage.py seed_demo"""

import io
import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from PIL import Image as PILImage, ImageDraw

from blog.models import Gallery, GalleryItem, HomeLayout, Image, Location, Post


def make_image(color: tuple[int, int, int], size=(1200, 800), label="") -> ContentFile:
    img = PILImage.new("RGB", size, color)
    draw = ImageDraw.Draw(img)
    for i in range(0, size[1], 40):  # basit şerit deseni
        draw.rectangle([0, i, size[0], i + 18], fill=tuple(min(255, c + 25) for c in color))
    draw.text((30, 30), label, fill="white")
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=80)
    return ContentFile(buf.getvalue())


class Command(BaseCommand):
    help = "Örnek yazı, galeri ve konumlar oluşturur (sadece DEBUG=1)."

    def _ensure_dev_admin(self):
        """Yerel geliştirme için admin kullanıcısı (parola: DEV_ADMIN_PASSWORD, bkz. .env.example)."""
        User = get_user_model()
        password = os.environ.get("DEV_ADMIN_PASSWORD", "dev-admin-pass")
        user, created = User.objects.get_or_create(username="admin", defaults={"is_staff": True, "is_superuser": True})
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write("Geliştirme admin kullanıcısı oluşturuldu: admin")

    def handle(self, *args, **opts):
        if not settings.DEBUG:
            raise CommandError("seed_demo sadece geliştirme ortamında çalışır.")
        self._ensure_dev_admin()
        if Post.objects.exists():
            self.stdout.write("Zaten içerik var, atlandı.")
            return

        kap = Location.objects.create(name="Kapadokya", latitude="38.643100", longitude="34.828900")
        ist = Location.objects.create(name="İstanbul", latitude="41.008200", longitude="28.978400")

        colors = [(180, 90, 60), (60, 120, 160), (90, 140, 90), (150, 110, 170), (200, 160, 70), (70, 70, 110)]
        imgs = []
        for i, c in enumerate(colors):
            im = Image(alt=f"Örnek görsel {i + 1}")
            im.file.save(f"demo-{i + 1}.jpg", make_image(c, label=f"Örnek {i + 1}"), save=True)
            imgs.append(im)

        gallery = Gallery.objects.create(title="Kapadokya Sergisi", description="Balonlar ve vadiler.", location=kap, is_published=True)
        for order, im in enumerate(imgs):
            GalleryItem.objects.create(gallery=gallery, image=im, order=order, caption=f"Kare {order + 1}")

        p1 = Post.objects.create(
            title="Kapadokya'da Bir Sabah",
            excerpt="Gün doğmadan balonların arasına karıştık.",
            cover=imgs[0],
            status="published",
            blocks=[
                {"type": "text", "markdown": "## Erken kalkmaya değdi\n\nSabah 4'te yola çıktık. **Soğuk** ama manzara muhteşemdi.\n\n- Balonlar\n- Vadiler\n- Sıcak çay"},
                {"type": "image", "src": imgs[1].file.url, "alt": "Vadi", "caption": "Güvercinlik Vadisi"},
                {"type": "columns", "columns": [
                    [{"type": "text", "markdown": "### Sol kolon\nGazete düzeninde yan yana akan metin. Uzun paragraflar kolonlara bölünerek okunur."}],
                    [{"type": "quote", "text": "Yolculuk, varmaktan güzeldir.", "author": "Atasözü"},
                     {"type": "image", "src": imgs[2].file.url, "alt": "Tepe"}],
                ]},
                {"type": "gallery", "gallery": gallery.slug},
                {"type": "map", "location": kap.id},
            ],
            theme={"font": "serif", "width": "normal"},
        )
        p1.locations.add(kap)

        p2 = Post.objects.create(
            title="İstanbul'da Kısa Bir Yürüyüş",
            excerpt="Karaköy'den Balat'a, sadece düz yazı.",
            cover=imgs[3],
            status="published",
            blocks=[{"type": "text", "markdown": "Bugün sadece **yürüdüm**. Notlarım:\n\n> Şehir, adımlarla okunur."}],
            theme={"font": "sans", "width": "narrow"},
        )
        p2.locations.add(ist)

        Post.objects.create(title="Yarım Kalmış Taslak", blocks=[{"type": "text", "markdown": "henüz yayında değil"}])

        HomeLayout.get_solo()
        self.stdout.write(self.style.SUCCESS("Örnek içerik oluşturuldu."))
