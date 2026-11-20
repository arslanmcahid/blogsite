from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(request):
    """Deploy sonrası / Docker healthcheck için basit canlılık kontrolü."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/", include("blog.urls")),
]

# Geliştirmede yüklenen görselleri Django servis eder; production'da Nginx eder.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
