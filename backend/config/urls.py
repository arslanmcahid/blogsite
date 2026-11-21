from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve as serve_file


def health(request):
    """Deploy sonrası / Docker healthcheck için basit canlılık kontrolü."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/", include("blog.urls")),
]



def serve_media(request, path):
    """Yüklenen görseller. Dosya adları değişmez (çakışmada rastgele ek alır), uzun süre önbelleğe alınabilir."""
    response = serve_file(request, path, document_root=settings.MEDIA_ROOT)
    response["Cache-Control"] = "public, max-age=2592000"
    return response


# Kişisel blog ölçeğinde görselleri Django'nun kendisi sunması yeterli; önündeki Caddy gzip/HTTP2 ekler.
# (Trafik büyürse bu satır yerine Caddy'nin dosya sunucusu kullanılabilir.)
urlpatterns += [re_path(r"^media/(?P<path>.*)$", serve_media)]
