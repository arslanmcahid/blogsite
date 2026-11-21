from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from .validators import (
    validate_ad_format,
    validate_blocks,
    validate_home_sections,
    validate_info,
    validate_placements,
    validate_sources,
    validate_theme,
)


class Image(models.Model):
    """Yüklenen tek bir görsel. Yazılar, galeriler ve kapaklar bunu kullanır."""

    # width_field/height_field: Django dosya yüklenirken boyutları bu sütunlara kendisi yazar.
    file = models.ImageField(upload_to="images/%Y/%m/", width_field="width", height_field="height")
    alt = models.CharField(max_length=200, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True, editable=False)
    height = models.PositiveIntegerField(null=True, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.alt or self.file.name


class Location(models.Model):
    """Konum etiketi: yazılara ve galerilere eklenir."""

    name = models.CharField(max_length=120)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class SluggedMixin(models.Model):
    """Başlıktan otomatik benzersiz slug (URL'de kullanılan kısa ad) üretir."""

    slug = models.SlugField(max_length=160, unique=True, blank=True, allow_unicode=True)

    class Meta:
        abstract = True

    def _make_slug(self, source: str) -> str:
        base = slugify(source, allow_unicode=True) or "icerik"
        slug, n = base, 2
        model = type(self)
        while model.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base}-{n}"
            n += 1
        return slug


class Category(SluggedMixin):
    """Yazı kategorisi (bir yazının tek kategorisi olur)."""

    name = models.CharField(max_length=80, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._make_slug(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Tag(SluggedMixin):
    """Serbest etiket (#güneş gibi); bir yazıya birden çok eklenebilir."""

    name = models.CharField(max_length=60, unique=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._make_slug(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Post(SluggedMixin):
    class Status(models.TextChoices):
        DRAFT = "draft", "Taslak"
        PUBLISHED = "published", "Yayında"

    title = models.CharField(max_length=200)
    excerpt = models.CharField(max_length=400, blank=True)
    cover = models.ForeignKey(Image, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    # Sıralı blok listesi (bkz. validators.py) ve yazıya özel tasarım ayarları.
    blocks = models.JSONField(default=list, blank=True, validators=[validate_blocks])
    theme = models.JSONField(default=dict, blank=True, validators=[validate_theme])
    locations = models.ManyToManyField(Location, blank=True, related_name="posts")
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="posts")
    tags = models.ManyToManyField(Tag, blank=True, related_name="posts")
    # Kaynakça ve "bilgi kartı" (etiket: değer satırları) yazıya özgü küçük listelerdir, JSON yeterli.
    sources = models.JSONField(default=list, blank=True, validators=[validate_sources])
    info = models.JSONField(default=list, blank=True, validators=[validate_info])
    # "Bunları da oku": elle seçilen ilgili yazılar (tek yönlü).
    related = models.ManyToManyField("self", symmetrical=False, blank=True, related_name="related_from")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._make_slug(self.title)
        # İlk yayınlandığında yayın tarihini otomatik koy.
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Gallery(SluggedMixin):
    """Fotoğraf sergisi."""

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    location = models.ForeignKey(Location, null=True, blank=True, on_delete=models.SET_NULL, related_name="galleries")
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "galleries"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._make_slug(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class GalleryItem(models.Model):
    gallery = models.ForeignKey(Gallery, on_delete=models.CASCADE, related_name="items")
    image = models.ForeignKey(Image, on_delete=models.CASCADE, related_name="+")
    caption = models.CharField(max_length=300, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


class HomeLayout(models.Model):
    """Ana sayfa düzeni. Tek kayıt (singleton): her zaman pk=1."""

    sections = models.JSONField(default=list, blank=True, validators=[validate_home_sections])
    updated_at = models.DateTimeField(auto_now=True)

    DEFAULT_SECTIONS = [
        {"type": "featured_post", "title": "Öne çıkan"},
        {"type": "latest_posts", "title": "Son yazılar", "limit": 6},
        {"type": "gallery_showcase", "title": "Sergiler"},
    ]

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls) -> "HomeLayout":
        obj, _ = cls.objects.get_or_create(pk=1, defaults={"sections": cls.DEFAULT_SECTIONS})
        return obj

    def __str__(self):
        return "Ana sayfa düzeni"


class Ad(models.Model):
    """Elden satılan reklam: görsel afiş ya da metinli kart. Reklamverenden kod alınmaz."""

    class Kind(models.TextChoices):
        BANNER = "banner", "Afiş"
        TEXT = "text", "Metinli kart"

    # Reklamın görüneceği yerler (sitede bu anahtarlarla çağrılır).
    PLACEMENTS = {
        "home": "Ana sayfa",
        "post_inline": "Yazı içi",
        "post_end": "Yazı sonu",
        "side_left": "Yan alan (sol)",
        "side_right": "Yan alan (sağ)",
    }

    name = models.CharField("Reklamveren / kampanya adı", max_length=120)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.BANNER)
    image = models.ForeignKey(Image, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    title = models.CharField(max_length=120, blank=True)
    body = models.CharField(max_length=300, blank=True)
    cta = models.CharField("Düğme yazısı", max_length=40, blank=True)
    link_url = models.URLField(max_length=500)
    # Afiş düzeltme: görselin gösterileceği oran (auto = görselin kendi oranı) ve kırpılırken
    # görselin hangi noktası ortada kalsın (yüzde olarak; 50/50 = orta).
    format = models.CharField(max_length=12, default="auto", validators=[validate_ad_format])
    focus_x = models.PositiveSmallIntegerField(default=50, validators=[MaxValueValidator(100)])
    focus_y = models.PositiveSmallIntegerField(default=50, validators=[MaxValueValidator(100)])
    placements = models.JSONField(default=list, blank=True, validators=[validate_placements])
    # Gösterilme ağırlığı: 3 olan reklam, 1 olandan ortalama 3 kat sık gösterilir.
    weight = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(10)])
    is_active = models.BooleanField(default=True)
    starts_on = models.DateField(null=True, blank=True)
    ends_on = models.DateField(null=True, blank=True)  # bu gün dahil
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def is_running(self, today=None) -> bool:
        today = today or timezone.localdate()
        return (
            self.is_active
            and (self.starts_on is None or self.starts_on <= today)
            and (self.ends_on is None or today <= self.ends_on)
        )


class AdDailyStat(models.Model):
    """Reklamın günlük gösterim/tıklama sayısı (günlük, haftalık, aylık raporlar buradan toplanır)."""

    ad = models.ForeignKey(Ad, on_delete=models.CASCADE, related_name="stats")
    date = models.DateField()
    placement = models.CharField(max_length=20)
    views = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["ad", "date", "placement"], name="uniq_ad_day_placement")]
        ordering = ["date"]
