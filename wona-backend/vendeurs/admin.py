from django.contrib import admin

from .models import AdresseRetrait, Vendeur


@admin.register(Vendeur)
class VendeurAdmin(admin.ModelAdmin):
    list_display = ("nom", "utilisateur", "categorie", "note_moyenne", "cree_le")
    search_fields = ("nom", "utilisateur__telephone")


admin.site.register(AdresseRetrait)
