from django.db import transaction
from rest_framework import serializers

from .models import Gallery, GalleryItem, HomeLayout, Image, Location, Post


class ImageSerializer(serializers.ModelSerializer):
    # Dosyanın tarayıcıdan erişilecek yolu (örn. /media/images/2026/11/a.jpg).
    url = serializers.CharField(source="file.url", read_only=True)

    class Meta:
        model = Image
        fields = ["id", "file", "url", "alt", "width", "height", "created_at"]
        read_only_fields = ["width", "height", "created_at"]
        extra_kwargs = {"file": {"write_only": True}}


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ["id", "name", "latitude", "longitude"]


class PostSerializer(serializers.ModelSerializer):
    # Yazma: `cover` ve `locations` id olarak gelir. Okuma için ayrıca zengin alanlar var.
    cover_url = serializers.CharField(source="cover.file.url", read_only=True, default=None)
    location_details = LocationSerializer(source="locations", many=True, read_only=True)

    class Meta:
        model = Post
        fields = [
            "id", "slug", "title", "excerpt", "cover", "cover_url", "status",
            "published_at", "blocks", "theme", "locations", "location_details",
            "created_at", "updated_at",
        ]
        read_only_fields = ["slug", "created_at", "updated_at"]
        # slug otomatik üretilir; istenirse admin'den sonradan değiştirilebilir.


class PostListSerializer(PostSerializer):
    """Liste görünümünde ağır `blocks` alanı gönderilmez."""

    class Meta(PostSerializer.Meta):
        fields = [f for f in PostSerializer.Meta.fields if f not in ("blocks", "theme")]


class GalleryItemSerializer(serializers.ModelSerializer):
    url = serializers.CharField(source="image.file.url", read_only=True)
    width = serializers.IntegerField(source="image.width", read_only=True)
    height = serializers.IntegerField(source="image.height", read_only=True)

    class Meta:
        model = GalleryItem
        fields = ["id", "image", "url", "width", "height", "caption", "order"]


class GallerySerializer(serializers.ModelSerializer):
    items = GalleryItemSerializer(many=True, required=False)
    location_detail = LocationSerializer(source="location", read_only=True)
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = Gallery
        fields = [
            "id", "slug", "title", "description", "location", "location_detail",
            "is_published", "cover_url", "items", "created_at",
        ]
        read_only_fields = ["slug", "created_at"]

    def get_cover_url(self, obj):
        first = obj.items.first()
        return first.image.file.url if first else None

    @staticmethod
    def _replace_items(gallery: Gallery, items: list[dict]) -> None:
        gallery.items.all().delete()
        GalleryItem.objects.bulk_create(
            GalleryItem(gallery=gallery, order=i, **{k: v for k, v in item.items() if k != "order"})
            for i, item in enumerate(items)
        )

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop("items", [])
        gallery = super().create(validated_data)
        self._replace_items(gallery, items)
        return gallery

    @transaction.atomic
    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)
        gallery = super().update(instance, validated_data)
        if items is not None:  # items gönderilmediyse mevcutlar korunur
            self._replace_items(gallery, items)
        return gallery


class HomeLayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeLayout
        fields = ["sections", "updated_at"]
        read_only_fields = ["updated_at"]
