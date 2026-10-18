from rest_framework import serializers

from accounts.models import Utilisateur
from courses.models import Course, Paiement, Signalement
from livreurs.models import Document, Livreur

from .models import ParametresPlateforme, Zone


class AdminUtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = [
            "id",
            "telephone",
            "nom_complet",
            "role",
            "telephone_verifie",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields


class AdminDocumentSerializer(serializers.ModelSerializer):
    type_label = serializers.CharField(source="get_type_display", read_only=True)
    url_telechargement = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "livreur",
            "type",
            "type_label",
            "url_telechargement",
            "statut",
            "commentaire_admin",
            "date_televersement",
            "verifie_le",
        ]
        read_only_fields = fields

    def get_url_telechargement(self, obj):
        from django.urls import reverse

        chemin = reverse("document-livreur-telecharger", kwargs={"pk": obj.pk})
        request = self.context.get("request")
        return request.build_absolute_uri(chemin) if request else chemin


class AdminLivreurSerializer(serializers.ModelSerializer):
    telephone = serializers.CharField(source="utilisateur.telephone", read_only=True)
    compte_actif = serializers.BooleanField(
        source="utilisateur.is_active", read_only=True
    )
    documents = AdminDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Livreur
        fields = [
            "id",
            "nom",
            "telephone",
            "ville",
            "moyen_transport",
            "immatriculation_moto",
            "statut_verification",
            "statut_disponibilite",
            "commentaire_verification",
            "note_moyenne",
            "nombre_avis",
            "date_inscription",
            "verifie_le",
            "compte_actif",
            "documents",
        ]
        read_only_fields = fields


class AdminCourseSerializer(serializers.ModelSerializer):
    vendeur_nom = serializers.CharField(source="vendeur.nom", read_only=True)
    livreur_nom = serializers.CharField(source="livreur.nom", read_only=True)

    class Meta:
        model = Course
        fields = "__all__"
        read_only_fields = [field.name for field in Course._meta.fields]


class AdminSignalementSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source="auteur.nom_complet", read_only=True)
    reference_course = serializers.CharField(
        source="course.reference", read_only=True
    )

    class Meta:
        model = Signalement
        fields = "__all__"
        read_only_fields = [field.name for field in Signalement._meta.fields]


class AdminPaiementSerializer(serializers.ModelSerializer):
    reference_course = serializers.CharField(
        source="course.reference", read_only=True
    )

    class Meta:
        model = Paiement
        fields = "__all__"
        read_only_fields = [field.name for field in Paiement._meta.fields]


class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = [
            "id",
            "nom",
            "ville",
            "latitude",
            "longitude",
            "rayon_km",
            "active",
            "cree_le",
        ]
        read_only_fields = ["id", "cree_le"]


class ParametresPlateformeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametresPlateforme
        fields = [
            "commission_pourcentage",
            "commission_fixe",
            "telephone_support",
            "whatsapp_support",
            "prix_livraison_minimum",
            "modifie_le",
        ]
        read_only_fields = ["modifie_le"]
