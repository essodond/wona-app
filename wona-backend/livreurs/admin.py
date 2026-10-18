from django.contrib import admin

from .models import Abonnement, Document, Livreur


class DocumentInline(admin.TabularInline):
    model = Document
    extra = 0
    readonly_fields = ("date_televersement",)


@admin.register(Livreur)
class LivreurAdmin(admin.ModelAdmin):
    list_display = (
        "nom",
        "utilisateur",
        "ville",
        "statut_verification",
        "statut_disponibilite",
        "note_moyenne",
    )
    list_filter = ("statut_verification", "statut_disponibilite", "ville")
    search_fields = ("nom", "utilisateur__telephone", "immatriculation_moto")
    inlines = [DocumentInline]


admin.site.register(Abonnement)
