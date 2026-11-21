from django.contrib import admin

from .models import Ad, AdDailyStat, Category, Gallery, GalleryItem, HomeLayout, Image, Location, Post, Tag


class GalleryItemInline(admin.TabularInline):
    model = GalleryItem
    extra = 0


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "published_at")
    list_filter = ("status",)
    search_fields = ("title",)


@admin.register(Gallery)
class GalleryAdmin(admin.ModelAdmin):
    list_display = ("title", "is_published")
    inlines = [GalleryItemInline]


admin.site.register(Image)

admin.site.register(HomeLayout)


admin.site.register(Category)
admin.site.register(Tag)


admin.site.register(Ad)
admin.site.register(AdDailyStat)
