import random
import re

from django.contrib.auth import authenticate, login, logout
from django.db.models import F, Q, Sum
from django.db.models.functions import TruncMonth, TruncWeek
from django.http import Http404, HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import action
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Ad, AdDailyStat, Category, Gallery, HomeLayout, Image, Location, Post, Tag
from .serializers import (
    AdSerializer,
    PublicAdSerializer,
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


# --- Reklamlar ---

BOT_RE = re.compile(r"bot|crawl|spider|slurp|preview|headless|facebookexternalhit", re.I)


def _countable(request) -> bool:
    """Botlar ve giriş yapmış yönetici (kendi tıklamaları) sayılmaz."""
    return not BOT_RE.search(request.headers.get("User-Agent", "")) and not is_staff(request)


def _bump(ad: Ad, placement: str, field: str) -> None:
    if placement not in Ad.PLACEMENTS:
        placement = "home"
    stat, _ = AdDailyStat.objects.get_or_create(ad=ad, date=timezone.localdate(), placement=placement)
    # F(): iki ziyaretçi aynı anda gelse de sayaç birbirini ezmez (veritabanında artırılır).
    AdDailyStat.objects.filter(pk=stat.pk).update(**{field: F(field) + 1})


class AdViewSet(viewsets.ModelViewSet):
    permission_classes = [StaffOnly]
    serializer_class = AdSerializer

    def get_queryset(self):
        return Ad.objects.select_related("image").annotate(views=Sum("stats__views"), clicks=Sum("stats__clicks"))

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """?group=day|week|month&from=YYYY-MM-DD&to=YYYY-MM-DD → dönem dönem gösterim/tıklama."""
        ad = self.get_object()
        qs = AdDailyStat.objects.filter(ad=ad)
        if f := request.query_params.get("from"):
            qs = qs.filter(date__gte=f)
        if t := request.query_params.get("to"):
            qs = qs.filter(date__lte=t)
        group = request.query_params.get("group", "day")
        trunc = {"week": TruncWeek, "month": TruncMonth}.get(group)
        period = trunc("date") if trunc else F("date")
        rows = (
            qs.annotate(period=period).values("period").annotate(views=Sum("views"), clicks=Sum("clicks")).order_by("period")
        )
        by_place = qs.values("placement").annotate(views=Sum("views"), clicks=Sum("clicks")).order_by("placement")
        totals = qs.aggregate(views=Sum("views"), clicks=Sum("clicks"))
        return Response({
            "group": group,
            "rows": [{"period": r["period"], "views": r["views"] or 0, "clicks": r["clicks"] or 0} for r in rows],
            "by_placement": [{"placement": r["placement"], "views": r["views"] or 0, "clicks": r["clicks"] or 0} for r in by_place],
            "totals": {"views": totals["views"] or 0, "clicks": totals["clicks"] or 0},
        })


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def sponsor_pick(request):
    """Bir yer için o an yayında olan reklamlardan birini (rastgele dönüşümlü) verir."""
    placement = request.query_params.get("placement", "")
    exclude = [int(x) for x in request.query_params.get("exclude", "").split(",") if x.isdigit()]
    today = timezone.localdate()
    candidates = (
        Ad.objects.select_related("image")
        .filter(is_active=True)
        .filter(Q(starts_on__isnull=True) | Q(starts_on__lte=today))
        .filter(Q(ends_on__isnull=True) | Q(ends_on__gte=today))
        .exclude(id__in=exclude)
    )
    ads = [a for a in candidates if placement in a.placements]
    if not ads:
        return Response({"ad": None})
    # Ağırlıklı rastgele: ağırlığı 3 olan, 1 olandan ortalama 3 kat sık seçilir (hepsi 1 ise eşit dönüş).
    return Response({"ad": PublicAdSerializer(random.choices(ads, weights=[a.weight for a in ads])[0]).data})


@csrf_exempt
def sponsor_view(request, pk):
    """Tarayıcı reklamı ekranda görünce çağırır (gösterim sayacı)."""
    if request.method != "POST":
        return HttpResponse(status=405)
    if _countable(request):
        ad = Ad.objects.filter(pk=pk).first()
        if ad and ad.is_running():
            _bump(ad, request.GET.get("p", ""), "views")
    return HttpResponse(status=204)


def sponsor_go(request, pk):
    """Reklam tıklaması: sayar, sonra reklamverenin adresine yönlendirir."""
    ad = Ad.objects.filter(pk=pk).first()
    if ad is None:
        raise Http404
    if _countable(request):
        _bump(ad, request.GET.get("p", ""), "clicks")
    return HttpResponseRedirect(ad.link_url)
