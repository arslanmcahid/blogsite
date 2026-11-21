import io
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image as PILImage
from rest_framework.test import APIClient

from blog.models import Gallery, HomeLayout, Image, Location, Post

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def media_tmp(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture
def anon():
    return APIClient()


@pytest.fixture
def admin_client():
    user = get_user_model().objects.create_user("admin", password="s3cret-pass", is_staff=True)
    client = APIClient()
    client.force_authenticate(user)
    return client


def png_file(name="a.png"):
    buf = io.BytesIO()
    PILImage.new("RGB", (40, 30), "red").save(buf, "PNG")
    buf.seek(0)
    buf.name = name
    return buf


# --- Blok doğrulaması ---

GOOD_BLOCKS = [
    {"type": "text", "markdown": "Merhaba"},
    {"type": "image", "src": "/media/x.jpg", "alt": "x"},
    {"type": "columns", "columns": [[{"type": "text", "markdown": "a"}], [{"type": "quote", "text": "b"}]]},
    {"type": "gallery", "gallery": "sergi"},
    {"type": "map", "location": 1},
]


def test_valid_blocks_accepted(admin_client):
    r = admin_client.post("/api/posts/", {"title": "Deneme", "blocks": GOOD_BLOCKS}, format="json")
    assert r.status_code == 201, r.content
    assert r.json()["slug"] == "deneme"


@pytest.mark.parametrize(
    "bad",
    [
        [{"type": "bilinmeyen"}],
        [{"type": "text"}],  # markdown eksik
        [{"type": "map", "location": "3"}],  # sayı olmalı
        [{"type": "columns", "columns": [[]]}],  # en az 2 kolon
        [{"type": "columns", "columns": [[{"type": "columns", "columns": [[], []]}], []]}],  # iç içe kolon
        {"type": "text", "markdown": "liste değil"},
    ],
)
def test_invalid_blocks_rejected(admin_client, bad):
    r = admin_client.post("/api/posts/", {"title": "Kötü", "blocks": bad}, format="json")
    assert r.status_code == 400
    assert "blocks" in r.json()


# --- Görünürlük ve yetki ---

def test_anonymous_sees_only_published_posts(anon):
    Post.objects.create(title="Taslak")
    Post.objects.create(title="Yayında", status="published")
    Post.objects.create(
        title="Gelecek", status="published", published_at=timezone.now() + timedelta(days=1)
    )
    titles = [p["title"] for p in anon.get("/api/posts/").json()]
    assert titles == ["Yayında"]
    assert anon.get("/api/posts/taslak/").status_code == 404


def test_staff_sees_drafts(admin_client):
    Post.objects.create(title="Taslak")
    assert admin_client.get("/api/posts/taslak/").status_code == 200


def test_anonymous_cannot_write(anon):
    assert anon.post("/api/posts/", {"title": "x"}, format="json").status_code in (401, 403)
    assert anon.put("/api/home/", {"sections": []}, format="json").status_code in (401, 403)
    assert anon.get("/api/images/").status_code in (401, 403)


def test_publish_sets_date_and_slug_is_unique(admin_client):
    a = admin_client.post("/api/posts/", {"title": "Aynı Başlık", "status": "published"}, format="json").json()
    b = admin_client.post("/api/posts/", {"title": "Aynı Başlık"}, format="json").json()
    assert a["published_at"] is not None
    assert a["slug"] == "aynı-başlık"
    assert b["slug"] != a["slug"]


# --- Giriş akışı (gerçek CSRF ile) ---

def test_login_flow():
    get_user_model().objects.create_user("admin", password="s3cret-pass", is_staff=True)
    c = APIClient(enforce_csrf_checks=True)
    token = c.get("/api/auth/csrf/").json()["csrfToken"]
    hdr = {"HTTP_X_CSRFTOKEN": token}
    assert c.post("/api/auth/login/", {"username": "admin", "password": "yanlis"}, format="json", **hdr).status_code == 400
    assert c.post("/api/auth/login/", {"username": "admin", "password": "s3cret-pass"}, format="json", **hdr).status_code == 200
    assert c.get("/api/auth/me/").json() == {"username": "admin"}
    token = c.get("/api/auth/csrf/").json()["csrfToken"]
    r = c.post("/api/posts/", {"title": "Girişli"}, format="json", HTTP_X_CSRFTOKEN=token)
    assert r.status_code == 201
    # CSRF başlığı olmadan yazma reddedilmeli
    assert c.post("/api/posts/", {"title": "Başlıksız"}, format="json").status_code == 403


def test_non_staff_cannot_login():
    get_user_model().objects.create_user("user", password="s3cret-pass")
    assert APIClient().post("/api/auth/login/", {"username": "user", "password": "s3cret-pass"}, format="json").status_code == 400


# --- Görsel, galeri, konum, ana sayfa ---

def test_image_upload_and_cover(admin_client):
    r = admin_client.post("/api/images/", {"file": png_file(), "alt": "kırmızı"}, format="multipart")
    assert r.status_code == 201, r.content
    img = r.json()
    assert img["url"].startswith("/media/images/") and (img["width"], img["height"]) == (40, 30)
    p = admin_client.post("/api/posts/", {"title": "Kapaklı", "cover": img["id"], "status": "published"}, format="json").json()
    assert p["cover_url"] == img["url"]


def test_non_image_upload_rejected(admin_client):
    bad = io.BytesIO(b"bu resim degil")
    bad.name = "x.png"
    assert admin_client.post("/api/images/", {"file": bad}, format="multipart").status_code == 400


def test_gallery_items_and_visibility(admin_client, anon):
    imgs = [Image.objects.create(file=SimpleUploadedFile(f"{i}.png", png_file().read())) for i in range(2)]
    r = admin_client.post(
        "/api/galleries/",
        {"title": "İstanbul", "is_published": False,
         "items": [{"image": imgs[1].id, "caption": "ikinci"}, {"image": imgs[0].id, "caption": "birinci"}]},
        format="json",
    )
    assert r.status_code == 201, r.content
    slug = r.json()["slug"]
    assert [i["caption"] for i in r.json()["items"]] == ["ikinci", "birinci"]
    assert anon.get(f"/api/galleries/{slug}/").status_code == 404  # yayında değil
    admin_client.patch(f"/api/galleries/{slug}/", {"is_published": True}, format="json")
    assert anon.get(f"/api/galleries/{slug}/").status_code == 200
    # items gönderilmeyen PATCH mevcut öğeleri silmemeli
    assert Gallery.objects.get(slug=slug).items.count() == 2


def test_locations_on_post(admin_client, anon):
    loc = admin_client.post("/api/locations/", {"name": "Kapadokya", "latitude": "38.643100", "longitude": "34.828900"}, format="json").json()
    admin_client.post("/api/posts/", {"title": "Gezi", "status": "published", "locations": [loc["id"]]}, format="json")
    items = anon.get(f"/api/posts/?location={loc['id']}").json()
    assert len(items) == 1 and items[0]["location_details"][0]["name"] == "Kapadokya"
    assert Location.objects.count() == 1


def test_home_layout(admin_client, anon):
    assert [s["type"] for s in anon.get("/api/home/").json()["sections"]][:1] == ["featured_post"]
    ok = admin_client.put("/api/home/", {"sections": [{"type": "latest_posts", "limit": 3}]}, format="json")
    assert ok.status_code == 200
    assert admin_client.put("/api/home/", {"sections": [{"type": "x"}]}, format="json").status_code == 400
    assert admin_client.put("/api/home/", {"sections": [{"type": "latest_posts", "limit": 99}]}, format="json").status_code == 400
    assert HomeLayout.objects.count() == 1


def test_home_sections_accept_items_and_reject_bad_items(admin_client):
    ok = admin_client.put("/api/home/", {"sections": [{"type": "latest_posts", "items": ["a", "b"]}]}, format="json")
    assert ok.status_code == 200
    bad = admin_client.put("/api/home/", {"sections": [{"type": "latest_posts", "items": [1]}]}, format="json")
    assert bad.status_code == 400


def test_category_tags_sources_info_and_filters(admin_client, anon):
    cat = admin_client.post("/api/categories/", {"name": "Gezi"}, format="json").json()
    tag = admin_client.post("/api/tags/", {"name": "Güneş"}, format="json").json()
    assert cat["slug"] == "gezi" and tag["slug"] == "güneş"
    body = {
        "title": "Etiketli", "status": "published", "category": cat["id"], "tags": [tag["id"]],
        "sources": [{"text": "Kaynak A", "url": "https://example.com"}, {"text": "Kaynak B"}],
        "info": [{"label": "Süre", "value": "3 gün"}],
    }
    created = admin_client.post("/api/posts/", body, format="json")
    assert created.status_code == 201, created.content
    slug = created.json()["slug"]
    detail = anon.get(f"/api/posts/{slug}/").json()
    assert detail["category_detail"]["name"] == "Gezi"
    assert detail["tag_details"][0]["name"] == "Güneş"
    assert detail["info"][0]["value"] == "3 gün"
    assert [p["slug"] for p in anon.get("/api/posts/?category=gezi").json()] == [slug]
    assert [p["slug"] for p in anon.get("/api/posts/?tag=güneş").json()] == [slug]
    assert anon.get("/api/posts/?tag=yok").json() == []
    # ziyaretçi kategori/etiket oluşturamaz
    assert anon.post("/api/tags/", {"name": "x"}, format="json").status_code in (401, 403)


def test_related_posts_hide_drafts_from_visitors(admin_client, anon):
    a = admin_client.post("/api/posts/", {"title": "A", "status": "published"}, format="json").json()
    b = admin_client.post("/api/posts/", {"title": "B", "status": "published"}, format="json").json()
    d = admin_client.post("/api/posts/", {"title": "Taslak"}, format="json").json()
    admin_client.patch(f"/api/posts/{a['slug']}/", {"related": [b["id"], d["id"]]}, format="json")
    assert [r["slug"] for r in anon.get(f"/api/posts/{a['slug']}/").json()["related_details"]] == [b["slug"]]
    assert len(admin_client.get(f"/api/posts/{a['slug']}/").json()["related_details"]) == 2


@pytest.mark.parametrize("bad", [
    {"sources": [{"text": ""}]},
    {"sources": [{"text": "x", "url": "javascript:alert(1)"}]},
    {"info": [{"label": "a"}]},
    {"blocks": [{"type": "video", "url": "https://evil.example.com/x"}]},
])
def test_rejects_invalid_new_fields(admin_client, bad):
    r = admin_client.post("/api/posts/", {"title": "T", **bad}, format="json")
    assert r.status_code == 400


def test_accepts_youtube_video_block(admin_client):
    for url in ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ"]:
        r = admin_client.post("/api/posts/", {"title": "V", "blocks": [{"type": "video", "url": url}]}, format="json")
        assert r.status_code == 201, r.content
