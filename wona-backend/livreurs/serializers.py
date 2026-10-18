import math
from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers
from django.urls import reverse

from .models import Document, Livreur


class DocumentSerializer(serializers.ModelSerializer):
    type_label = serializers.CharField(source="get_type_display", read_only=True)
    url_telechargement = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "type",
            "type_label",
            "fichier",
            "url_telechargement",
            "statut",
            "commentaire_admin",
            "date_televersement",
            "verifie_le",
        ]
        read_only_fields = [
            "id",
            "type_label",
            "statut",
            "commentaire_admin",
            "date_televersement",
            "verifie_le",
        ]
        extra_kwargs = {"fichier": {"write_only": True}}

    def get_url_telechargement(self, obj):
        chemin = reverse("document-livreur-telecharger", kwargs={"pk": obj.pk})
        request = self.context.get("request")
        return request.build_absolute_uri(chemin) if request else chemin

    def validate_fichier(self, fichier):
        types_autorises = {
            "image/jpeg",
            "image/png",
            "application/pdf",
        }
        content_type = getattr(fichier, "content_type", None)
        if content_type and content_type not in types_autorises:
            raise serializers.ValidationError(
                "Formats autorisés : JPG, PNG ou PDF."
            )
        return fichier


class LivreurSerializer(serializers.ModelSerializer):
    telephone = serializers.CharField(source="utilisateur.telephone", read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    peut_accepter_course = serializers.SerializerMethodField()

    class Meta:
        model = Livreur
        fields = [
            "id",
            "nom",
            "telephone",
            "ville",
            "moyen_transport",
            "immatriculation_moto",
            "photo",
            "statut_verification",
            "statut_disponibilite",
            "commentaire_verification",
            "note_moyenne",
            "nombre_avis",
            "date_inscription",
            "derniere_position_lat",
            "derniere_position_lng",
            "position_mise_a_jour_le",
            "peut_accepter_course",
            "documents",
        ]
        read_only_fields = [
            "id",
            "telephone",
            "statut_verification",
            "statut_disponibilite",
            "commentaire_verification",
            "note_moyenne",
            "nombre_avis",
            "date_inscription",
            "derniere_position_lat",
            "derniere_position_lng",
            "position_mise_a_jour_le",
            "peut_accepter_course",
            "documents",
        ]

    def get_peut_accepter_course(self, obj):
        return (
            obj.statut_verification == "valide"
            and obj.statut_disponibilite == "disponible"
            and obj.utilisateur.is_active
        )

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if instance.nom and instance.utilisateur.nom_complet != instance.nom:
            instance.utilisateur.nom_complet = instance.nom
            instance.utilisateur.save(update_fields=["nom_complet"])
        return instance


class PositionLivreurSerializer(serializers.Serializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)

    def validate(self, attrs):
        precision = Decimal("0.000001")
        for field in ("latitude", "longitude"):
            value = attrs[field]
            if not math.isfinite(value):
                raise serializers.ValidationError(
                    {field: "La coordonnée GPS est invalide."}
                )
            attrs[field] = Decimal(str(value)).quantize(
                precision,
                rounding=ROUND_HALF_UP,
            )
        return attrs


class DisponibiliteSerializer(serializers.Serializer):
    disponible = serializers.BooleanField()
