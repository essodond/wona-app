from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import AppareilNotification, Utilisateur
from .validators import normaliser_telephone


class TelephoneMixin:
    def validate_telephone(self, value):
        try:
            return normaliser_telephone(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages[0]) from exc


class DemandeOTPSerializer(TelephoneMixin, serializers.Serializer):
    telephone = serializers.CharField(max_length=30)
    role = serializers.ChoiceField(choices=["vendeur", "livreur"])


class VerificationOTPSerializer(TelephoneMixin, serializers.Serializer):
    telephone = serializers.CharField(max_length=30)
    code = serializers.RegexField(r"^\d{6}$")
    role = serializers.ChoiceField(choices=["vendeur", "livreur"])
    nom = serializers.CharField(max_length=150, required=False, allow_blank=True)


class UtilisateurSerializer(serializers.ModelSerializer):
    validation_livreur = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            "id",
            "telephone",
            "nom_complet",
            "role",
            "telephone_verifie",
            "photo",
            "whatsapp",
            "is_active",
            "validation_livreur",
            "date_joined",
        ]
        read_only_fields = [
            "id",
            "telephone",
            "role",
            "telephone_verifie",
            "is_active",
            "validation_livreur",
            "date_joined",
        ]

    def get_validation_livreur(self, obj):
        if obj.role != "livreur" or not hasattr(obj, "livreur"):
            return None
        return obj.livreur.statut_verification


class ConnexionAdminSerializer(TelephoneMixin, serializers.Serializer):
    telephone = serializers.CharField(max_length=30)
    mot_de_passe = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        utilisateur = authenticate(
            self.context.get("request"),
            telephone=attrs["telephone"],
            password=attrs["mot_de_passe"],
        )
        if (
            utilisateur is None
            or not utilisateur.is_active
            or not utilisateur.is_staff
        ):
            raise serializers.ValidationError("Identifiants administrateur invalides.")
        attrs["utilisateur"] = utilisateur
        return attrs


class AppareilNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppareilNotification
        fields = ["id", "jeton", "plateforme", "actif", "modifie_le"]
        read_only_fields = ["id", "modifie_le"]
