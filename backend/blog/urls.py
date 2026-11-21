from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("posts", views.PostViewSet, basename="post")
router.register("galleries", views.GalleryViewSet, basename="gallery")
router.register("locations", views.LocationViewSet, basename="location")
router.register("categories", views.CategoryViewSet, basename="category")
router.register("tags", views.TagViewSet, basename="tag")
router.register("ads", views.AdViewSet, basename="ad")
router.register("images", views.ImageViewSet, basename="image")

urlpatterns = [
    path("home/", views.HomeLayoutView.as_view()),
    path("sponsor/pick/", views.sponsor_pick),
    path("sponsor/<int:pk>/view/", views.sponsor_view),
    path("sponsor/<int:pk>/go/", views.sponsor_go),
    path("auth/csrf/", views.csrf),
    path("auth/login/", views.login_view),
    path("auth/logout/", views.logout_view),
    path("auth/me/", views.me),
    path("", include(router.urls)),
]
