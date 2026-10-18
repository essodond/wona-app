from django.contrib import admin

from .models import JournalAudit, Notification, ParametresPlateforme, Zone


@admin.register(JournalAudit)
class JournalAuditAdmin(admin.ModelAdmin):
    list_display = (
        "cree_le",
        "action",
        "utilisateur",
        "cible_type",
        "cible_id",
        "adresse_ip",
    )
    list_filter = ("action", "cible_type")
    search_fields = ("action", "cible_id", "utilisateur__telephone")
    readonly_fields = [field.name for field in JournalAudit._meta.fields]


admin.site.register(Notification)
admin.site.register(Zone)
admin.site.register(ParametresPlateforme)
