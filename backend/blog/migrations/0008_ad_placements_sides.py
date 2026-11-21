from django.db import migrations

# Eski yerleşimlerin yenilerine karşılığı: yan alanlar artık sayfa türüne göre ayrı seçilir.
MAP = {
    "side_left": ["home_left", "post_left"],
    "side_right": ["home_right", "post_right"],
    "post_inline": [],  # yazı içi reklam kaldırıldı
}


def forwards(apps, schema_editor):
    Ad = apps.get_model("blog", "Ad")
    for ad in Ad.objects.all():
        new = []
        for p in ad.placements or []:
            for q in MAP.get(p, [p]):
                if q not in new:
                    new.append(q)
        if new != ad.placements:
            ad.placements = new
            ad.save(update_fields=["placements"])

    # Yazı içindeki "Reklam" blokları (sütunların içindekiler dahil) kaldırılır.
    Post = apps.get_model("blog", "Post")
    for post in Post.objects.all():
        blocks, changed = [], False
        for b in post.blocks or []:
            if b.get("type") == "ad":
                changed = True
                continue
            if b.get("type") == "columns":
                cols = [[x for x in col if x.get("type") != "ad"] for col in b.get("columns", [])]
                if cols != b.get("columns"):
                    changed = True
                    b = {**b, "columns": cols}
            blocks.append(b)
        if changed:
            post.blocks = blocks
            post.save(update_fields=["blocks"])


class Migration(migrations.Migration):
    dependencies = [("blog", "0007_image_focus_auto")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
