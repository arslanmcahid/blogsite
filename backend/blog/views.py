from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Gallery, HomeLayout, Image, Location, Post, Tag
from .serializers import (
    CategorySerializer,
    GallerySerializer,
    HomeLayoutSerializer,
    ImageSerializer,
    LocationSerializer,
    PostListSerializer,
    PostSerializer,
    TagSerializer,
)


class IsStaffOrReadOnly(permissions.BasePermission):
    """Okuma herkese açık; yazma sadece giriş yapmış admin (is_staff) kullanıcıya."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class StaffOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


def is_staff(request) -> bool:
    return bool(request.user.is_authenticated and request.user.is_staff)


class PostViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffOrReadOnly]
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"  # unicode slug'lar için

    def get_queryset(self):
        qs = Post.objects.select_related("cover", "category").prefetch_related("locations", "tags")
        if not is_staff(self.request):
            # Ziyaretçi sadece yayınlanmış ve tarihi gelmiş yazıları görür.
            qs = qs.filter(status=Post.Status.PUBLISHED, published_at__lte=timezone.now())
        if loc := self.request.query_params.get("location"):
            qs = qs.filter(locations__id=loc)
        if cat := self.request.query_params.get("category"):
            qs = qs.filter(category__slug=cat)
        if tag := self.request.query_params.get("tag"):
            qs = qs.filter(tags__slug=tag)
        return qs

    def get_serializer_class(self):
        return PostListSerializer if self.action == "list" else PostSerializer


class GalleryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffOrReadOnly]
    serializer_class = GallerySerializer
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"

    def get_queryset(self):
        qs = Gallery.objects.select_related("location").prefetch_related("items__image")
        if not is_staff(self.request):
            qs = qs.filter(is_published=True)
        return qs


class LocationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffOrReadOnly]
    serializer_class = LocationSerializer
    queryset = Location.objects.all()


class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffOrReadOnly]
    serializer_class = CategorySerializer
    queryset = Category.objects.all()


class TagViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffOrReadOnly]
    serializer_class = TagSerializer
    queryset = Tag.objects.all()


class ImageViewSet(viewsets.ModelViewSet):
    """Görsel yükleme/listeleme: sadece admin (ziyaretçiler görseli /media/ yolundan alır)."""

    permission_classes = [StaffOnly]
    serializer_class = ImageSerializer
    queryset = Image.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class HomeLayoutView(APIView):
    permission_classes = [IsStaffOrReadOnly]

    def get(self, request):
        return Response(HomeLayoutSerializer(HomeLayout.get_solo()).data)

    def put(self, request):
        serializer = HomeLayoutSerializer(HomeLayout.get_solo(), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# --- Kimlik doğrulama (oturum/cookie tabanlı) ---

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def csrf(request):
    """Admin arayüzü yazma isteklerinden önce bunu çağırıp CSRF cookie'sini alır."""
    return Response({"csrfToken": get_token(request)})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    user = authenticate(
        request,
        username=request.data.get("username", ""),
        password=request.data.get("password", ""),
    )
    if user is None or not user.is_staff:
        return Response({"detail": "Kullanıcı adı veya parola hatalı."}, status=400)
    login(request, user)
    return Response({"username": user.get_username()})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def logout_view(request):
    logout(request)
    return Response(status=204)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def me(request):
    if not is_staff(request):
        return Response({"detail": "Giriş yapılmadı."}, status=401)
    return Response({"username": request.user.get_username()})
