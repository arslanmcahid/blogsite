"""
Blok şeması doğrulaması.

Bir yazının içeriği `Post.blocks` alanında sıralı bir JSON listesi olarak tutulur:

    [
      {"type": "text", "markdown": "Merhaba **dünya**"},
      {"type": "image", "src": "/media/images/a.jpg", "alt": "...", "caption": "..."},
      {"type": "columns", "columns": [[<blok>, ...], [<blok>, ...]]},   # gazete düzeni
      {"type": "quote", "text": "...", "author": "..."},
      {"type": "gallery", "gallery": "sergi-slug"},
      {"type": "video", "url": "https://www.youtube.com/watch?v=..."},
      {"type": "map", "location": 3}
    ]

Neden JSON? İçeriği "sayfa kodu" yerine veri olarak tuttuğumuz için tasarım
değiştiğinde eski yazılar bozulmaz; editör ve renderer aynı şemayı paylaşır.
Veritabanı bu iç yapıyı denetlemez, o yüzden burada kendimiz doğruluyoruz.
Aynı şema frontend'de TypeScript tipleri olarak da tanımlanacak.
"""

import re

from django.core.exceptions import ValidationError

# youtube.com/watch?v=…, youtu.be/…, youtube.com/embed/… ve shorts adresleri
YOUTUBE_RE = re.compile(r"^https?://(www\.|m\.)?(youtube\.com/(watch\?(.*&)?v=|embed/|shorts/)|youtu\.be/)[\w-]{11}([&?#].*)?$")

MAX_BLOCKS = 200
MAX_COLUMNS = 4


def _require_str(block: dict, key: str, where: str, *, required: bool = True):
    value = block.get(key)
    if value is None:
        if required:
            raise ValidationError(f"{where}: '{key}' alanı zorunlu.")
        return
    if not isinstance(value, str):
        raise ValidationError(f"{where}: '{key}' metin olmalı.")


def _validate_block(block, where: str, *, nested: bool) -> None:
    if not isinstance(block, dict):
        raise ValidationError(f"{where}: blok bir nesne olmalı.")
    kind = block.get("type")

    if kind == "text":
        _require_str(block, "markdown", where)
    elif kind == "image":
        _require_str(block, "src", where)
        _require_str(block, "alt", where, required=False)
        _require_str(block, "caption", where, required=False)
    elif kind == "quote":
        _require_str(block, "text", where)
        _require_str(block, "author", where, required=False)
    elif kind == "gallery":
        _require_str(block, "gallery", where)
    elif kind == "video":
        _require_str(block, "url", where)
        if not YOUTUBE_RE.match(block["url"].strip()):
            raise ValidationError(f"{where}: video adresi bir YouTube bağlantısı olmalı.")
    elif kind == "map":
        if not isinstance(block.get("location"), int):
            raise ValidationError(f"{where}: 'location' bir konum id'si (sayı) olmalı.")
    elif kind == "columns":
        if nested:
            raise ValidationError(f"{where}: kolon bloğu başka bir kolonun içine konamaz.")
        columns = block.get("columns")
        if not isinstance(columns, list) or not 2 <= len(columns) <= MAX_COLUMNS:
            raise ValidationError(f"{where}: 'columns' 2-{MAX_COLUMNS} kolonluk bir liste olmalı.")
        for ci, column in enumerate(columns):
            if not isinstance(column, list):
                raise ValidationError(f"{where}: kolon {ci + 1} bir blok listesi olmalı.")
            for bi, inner in enumerate(column):
                _validate_block(inner, f"{where}.kolon{ci + 1}[{bi}]", nested=True)
    else:
        raise ValidationError(f"{where}: bilinmeyen blok türü '{kind}'.")


def validate_blocks(value) -> None:
    if not isinstance(value, list):
        raise ValidationError("İçerik bir blok listesi olmalı.")
    if len(value) > MAX_BLOCKS:
        raise ValidationError(f"En fazla {MAX_BLOCKS} blok olabilir.")
    for i, block in enumerate(value):
        _validate_block(block, f"blok[{i}]", nested=False)


HOME_SECTION_TYPES = {"featured_post", "latest_posts", "gallery_showcase", "map", "text", "ad"}


def validate_home_sections(value) -> None:
    """Ana sayfa bölümleri: [{"type": "latest_posts", "title": "...", "limit": 6}, ...]"""
    if not isinstance(value, list):
        raise ValidationError("Bölümler bir liste olmalı.")
    for i, section in enumerate(value):
        if not isinstance(section, dict) or section.get("type") not in HOME_SECTION_TYPES:
            raise ValidationError(
                f"bölüm[{i}]: 'type' şunlardan biri olmalı: {', '.join(sorted(HOME_SECTION_TYPES))}."
            )
        limit = section.get("limit")
        if limit is not None and (not isinstance(limit, int) or not 1 <= limit <= 50):
            raise ValidationError(f"bölüm[{i}]: 'limit' 1-50 arası bir sayı olmalı.")
        # "items": elle seçilmiş yazı/sergi slug'ları. Yoksa bölüm otomatik (en yeniler) dolar.
        items = section.get("items")
        if items is not None and (
            not isinstance(items, list) or len(items) > 50 or not all(isinstance(x, str) for x in items)
        ):
            raise ValidationError(f"bölüm[{i}]: 'items' en fazla 50 slug'lık bir liste olmalı.")


def validate_theme(value) -> None:
    """Yazı tasarım ayarları (serbest anahtar-değer, ama nesne olmalı)."""
    if not isinstance(value, dict):
        raise ValidationError("Tema bir nesne olmalı.")


def validate_sources(value) -> None:
    """Kaynakça: [{"text": "Yazar (2026). Başlık.", "url": "https://..."}] (url isteğe bağlı)."""
    if not isinstance(value, list) or len(value) > 50:
        raise ValidationError("Kaynakça en fazla 50 kaynaklık bir liste olmalı.")
    for i, src in enumerate(value):
        if not isinstance(src, dict) or not isinstance(src.get("text"), str) or not src["text"].strip():
            raise ValidationError(f"kaynak[{i}]: 'text' dolu bir metin olmalı.")
        if len(src["text"]) > 500:
            raise ValidationError(f"kaynak[{i}]: metin en fazla 500 karakter olabilir.")
        url = src.get("url")
        if url not in (None, "") and not (isinstance(url, str) and re.match(r"^https?://", url)):
            raise ValidationError(f"kaynak[{i}]: 'url' http:// veya https:// ile başlamalı.")


def validate_info(value) -> None:
    """Bilgi kartı: [{"label": "Süre", "value": "3 gün"}]"""
    if not isinstance(value, list) or len(value) > 20:
        raise ValidationError("Bilgi kartı en fazla 20 satırlık bir liste olmalı.")
    for i, row in enumerate(value):
        if not isinstance(row, dict) or not isinstance(row.get("label"), str) or not isinstance(row.get("value"), str):
            raise ValidationError(f"satır[{i}]: 'label' ve 'value' metin olmalı.")
        if len(row["label"]) > 80 or len(row["value"]) > 300:
            raise ValidationError(f"satır[{i}]: metin çok uzun.")


# Reklam yerleri: home (ana sayfa içeriği), *_left/*_right (geniş ekranda sayfanın iki yanı),
# post_end (yazının altı), bottom_bar (kaydırırken ekranın altında hep görünen şerit).
AD_PLACEMENTS = {"home", "home_left", "home_right", "post_left", "post_right", "post_end", "bottom_bar"}
AD_FORMATS = {"auto", "leaderboard", "billboard", "rect", "tall"}


def validate_placements(value) -> None:
    if not isinstance(value, list) or not all(v in AD_PLACEMENTS for v in value):
        raise ValidationError(f"Yerleşimler şunlardan olmalı: {', '.join(sorted(AD_PLACEMENTS))}.")


def validate_ad_format(value) -> None:
    if value not in AD_FORMATS:
        raise ValidationError(f"Biçim şunlardan biri olmalı: {', '.join(sorted(AD_FORMATS))}.")
