from django.contrib import admin

from .models import (
    Avis,
    Course,
    HistoriqueStatut,
    MessageCourse,
    Paiement,
    Signalement,
)


class HistoriqueInline(admin.TabularInline):
    model = HistoriqueStatut
    extra = 0
    readonly_fields = (
        "ancien_statut",
        "nouveau_statut",
        "utilisateur",
        "commentaire",
        "date_creation",
    )
    can_delete = False


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "vendeur",
        "livreur",
        "statut",
        "prix_livraison",
        "date_creation",
    )
    list_filter = ("statut", "urgence", "methode_paiement")
    search_fields = (
        "reference",
        "destinataire_nom",
        "destinataire_telephone",
        "adresse_depart",
        "adresse_arrivee",
    )
    readonly_fields = (
        "reference",
        "code_pin_hash",
        "date_creation",
        "date_modification",
    )
    inlines = [HistoriqueInline]


admin.site.register(Paiement)
admin.site.register(Avis)
admin.site.register(Signalement)
admin.site.register(MessageCourse)
