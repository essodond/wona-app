from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AppareilNotification, CodeOTP, Utilisateur


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    model = Utilisateur
    ordering = ("telephone",)
    list_display = (
        "telephone",
        "nom_complet",
        "role",
        "telephone_verifie",
        "is_active",
        "is_staff",
    )
    search_fields = ("telephone", "nom_complet")
    list_filter = ("role", "telephone_verifie", "is_active", "is_staff")
    fieldsets = (
        (None, {"fields": ("telephone", "password")}),
        (
            "Profil",
            {
                "fields": (
                    "nom_complet",
                    "role",
                    "telephone_verifie",
                    "photo",
                    "whatsapp",
                )
            },
        ),
        (
            "Autorisations",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "telephone",
                    "nom_complet",
                    "role",
                    "password1",
                    "password2",
                    "is_staff",
                    "is_active",
                ),
            },
        ),
    )


@admin.register(CodeOTP)
class CodeOTPAdmin(admin.ModelAdmin):
    list_display = (
        "telephone",
        "role",
        "date_creation",
        "expire_le",
        "utilise",
        "tentatives",
    )
    readonly_fields = (
        "telephone",
        "role",
        "code",
        "date_creation",
        "expire_le",
        "utilise",
        "utilise_le",
        "tentatives",
        "adresse_ip",
    )


admin.site.register(AppareilNotification)
