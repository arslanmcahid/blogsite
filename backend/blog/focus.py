"""
Görselin "önemli" noktasını otomatik bulur (kırpılırken orada kalsın diye).

Basit ve bağımlılıksız bir yöntem: görsel küçültülür, her pikselin "ilgi çekicilik" puanı
kenar şiddeti (ayrıntı), renk doygunluğu ve ten rengi benzerliğinden hesaplanır; puanların ağırlık
merkezi odak noktası olur. Yüz tanıma kadar kesin değildir ama portre ve nesne fotoğraflarında
konuyu boş gökyüzü ya da duvardan ayırmak için iyi çalışır. Admin gerekirse elle düzeltebilir.
"""

from PIL import Image as PILImage
from PIL import ImageFilter

SIZE = 64


def smart_focus(fileobj) -> tuple[int, int]:
    """(x, y) yüzde olarak, 0-100. Hata olursa ortayı (50, 50) döndürür."""
    try:
        with PILImage.open(fileobj) as im:
            im = im.convert("RGB")
            im.thumbnail((SIZE, SIZE))
            w, h = im.size
            edges = im.convert("L").filter(ImageFilter.FIND_EDGES)
            rgb, edge = im.load(), edges.load()
            total = sx = sy = 0.0
            for y in range(h):
                for x in range(w):
                    r, g, b = rgb[x, y]
                    mx, mn = max(r, g, b), min(r, g, b)
                    sat = (mx - mn) / mx if mx else 0.0
                    skin = 1.0 if (r > 95 and g > 40 and b > 20 and mx - mn > 15 and abs(r - g) > 15 and r > g and r > b) else 0.0
                    score = (edge[x, y] / 255) + 0.6 * sat + 0.8 * skin
                    score = (score + 0.02) ** 2  # tepeleri öne çıkar, düz alanları sönükleştir
                    total += score
                    sx += score * x
                    sy += score * y
            if total == 0:
                return 50, 50
            fx = (sx / total + 0.5) / w * 100
            fy = (sy / total + 0.5) / h * 100
            # Kenarlara yapışmasın: çok uçta bir odak, kırpmada konuyu yarım bırakır.
            return round(min(85, max(15, fx))), round(min(85, max(15, fy)))
    except Exception:
        return 50, 50
