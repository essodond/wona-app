from rest_framework import serializers

from accounts.validators import normaliser_telephone
from livreurs.serializers import LivreurSerializer

from .models import (
    Avis,
    Course,
    HistoriqueStatut,
    MessageCourse,
    Paiement,
    Signalement,
)


class HistoriqueStatutSerializer(serializers.ModelSerializer):
    auteur = serializers.CharField(source="utilisateur.nom_complet", read_only=True)
    libelle = serializers.SerializerMethodField()

    class Meta:
        model = HistoriqueStatut
        fields = [
            "id",
            "ancien_statut",
            "nouveau_statut",
            "libelle",
            "auteur",
            "commentaire",
            "date_creation",
        ]

    def get_libelle(self, obj):
        return dict(Course.STATUT_CHOICES).get(obj.nouveau_statut, obj.nouveau_statut)


class PaiementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paiement
        fields = [
            "id",
            "type",
            "montant",
            "methode",
            "reference",
            "statut",
            "date_creation",
            "paye_le",
        ]
        read_only_fields = fields


class AvisSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source="auteur.nom_complet", read_only=True)

    class Meta:
        model = Avis
        fields = ["id", "auteur_nom", "note", "commentaire", "date_creation"]
        read_only_fields = ["id", "auteur_nom", "date_creation"]


class SignalementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Signalement
        fields = [
            "id",
            "motif",
            "description",
            "preuve",
            "statut",
            "resolution",
            "date_creation",
            "resolu_le",
        ]
        read_only_fields = [
            "id",
            "statut",
            "resolution",
            "date_creation",
            "resolu_le",
        ]


class MessageCourseSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source="auteur.nom_complet", read_only=True)
    auteur_role = serializers.CharField(source="auteur.role", read_only=True)

    class Meta:
        model = MessageCourse
        fields = [
            "id",
            "auteur_nom",
            "auteur_role",
            "contenu",
            "date_creation",
        ]
        read_only_fields = [
            "id",
            "auteur_nom",
            "auteur_role",
            "date_creation",
        ]


class CourseDisponibleSerializer(serializers.ModelSerializer):
    taille_label = serializers.CharField(
        source="get_taille_colis_display", read_only=True
    )
    urgence_label = serializers.CharField(source="get_urgence_display", read_only=True)
    vendeur = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "reference",
            "zone_depart",
            "zone_arrivee",
            "distance_estimee_km",
            "description_colis",
            "taille_colis",
            "taille_label",
            "prix_livraison",
            "urgence",
            "urgence_label",
            "date_creation",
            "vendeur",
        ]

    def get_vendeur(self, obj):
        return {
            "nom": obj.vendeur.nom,
            "note_moyenne": obj.vendeur.note_moyenne,
            "nombre_avis": obj.vendeur.nombre_avis,
        }


class CourseSerializer(serializers.ModelSerializer):
    vendeur_detail = serializers.SerializerMethodField()
    livreur_detail = LivreurSerializer(source="livreur", read_only=True)
    statut_label = serializers.CharField(source="get_statut_display", read_only=True)
    historique_statuts = HistoriqueStatutSerializer(many=True, read_only=True)
    paiements = PaiementSerializer(many=True, read_only=True)
    avis = AvisSerializer(many=True, read_only=True)
    peut_modifier = serializers.SerializerMethodField()
    peut_annuler = serializers.SerializerMethodField()
    informations_masquees = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "reference",
            "vendeur",
            "vendeur_detail",
            "livreur",
            "livreur_detail",
            "destinataire_nom",
            "destinataire_telephone",
            "adresse_depart",
            "zone_depart",
            "depart_latitude",
            "depart_longitude",
            "adresse_arrivee",
            "zone_arrivee",
            "arrivee_latitude",
            "arrivee_longitude",
            "distance_estimee_km",
            "description_colis",
            "taille_colis",
            "instructions",
            "photo_colis",
            "prix_livraison",
            "montant_a_recuperer",
            "methode_paiement",
            "urgence",
            "statut",
            "statut_label",
            "code_pin_apercu",
            "remise_confirmee_par_vendeur",
            "remise_confirmee_le",
            "preuve_livraison",
            "motif_annulation",
            "motif_echec",
            "date_creation",
            "date_modification",
            "publiee_le",
            "acceptee_le",
            "recuperee_le",
            "livree_le",
            "historique_statuts",
            "paiements",
            "avis",
            "peut_modifier",
            "peut_annuler",
            "informations_masquees",
        ]
        read_only_fields = [
            "id",
            "reference",
            "vendeur",
            "livreur",
            "statut",
            "code_pin_apercu",
            "remise_confirmee_par_vendeur",
            "remise_confirmee_le",
            "preuve_livraison",
            "motif_annulation",
            "motif_echec",
            "date_creation",
            "date_modification",
            "publiee_le",
            "acceptee_le",
            "recuperee_le",
            "livree_le",
            "historique_statuts",
            "paiements",
            "avis",
        ]

    def validate_destinataire_telephone(self, value):
        return normaliser_telephone(value)

    def get_vendeur_detail(self, obj):
        data = {
            "nom": obj.vendeur.nom,
            "note_moyenne": obj.vendeur.note_moyenne,
            "nombre_avis": obj.vendeur.nombre_avis,
        }
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return data
        user = request.user
        est_participant_accepte = (
            user.is_staff
            or obj.vendeur.utilisateur_id == user.id
            or (
                obj.livreur_id
                and obj.livreur.utilisateur_id == user.id
            )
        )
        if est_participant_accepte:
            data.update(
                {
                    "telephone": obj.vendeur.utilisateur.telephone,
                    "whatsapp": obj.vendeur.whatsapp
                    or obj.vendeur.utilisateur.whatsapp,
                }
            )
        return data

    def validate(self, attrs):
        if not attrs.get("zone_depart") and attrs.get("adresse_depart"):
            attrs["zone_depart"] = attrs["adresse_depart"][:120]
        if not attrs.get("zone_arrivee") and attrs.get("adresse_arrivee"):
            attrs["zone_arrivee"] = attrs["adresse_arrivee"][:120]
        return attrs

    def _est_masque(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return True
        user = request.user
        if user.is_staff:
            return False
        if user.role == "vendeur" and obj.vendeur.utilisateur_id == user.id:
            return False
        if (
            user.role == "livreur"
            and obj.livreur_id
            and obj.livreur.utilisateur_id == user.id
        ):
            return False
        return True

    def _peut_voir_apercu_pin(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        user = request.user
        return bool(
            user.is_staff
            or (
                user.role == "vendeur"
                and obj.vendeur.utilisateur_id == user.id
            )
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self._peut_voir_apercu_pin(instance):
            data["code_pin_apercu"] = ""
        if self._est_masque(instance):
            data["destinataire_nom"] = "Informations après acceptation"
            data["destinataire_telephone"] = None
            data["adresse_depart"] = instance.zone_depart
            data["adresse_arrivee"] = instance.zone_arrivee
            data["depart_latitude"] = None
            data["depart_longitude"] = None
            data["arrivee_latitude"] = None
            data["arrivee_longitude"] = None
            data["instructions"] = ""
            data["montant_a_recuperer"] = None
        return data

    def get_peut_modifier(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and request.user.role == "vendeur"
            and obj.vendeur.utilisateur_id == request.user.id
            and obj.livreur_id is None
            and obj.statut in {"brouillon", "en_attente"}
        )

    def get_peut_annuler(self, obj):
        request = self.context.get("request")
        statuts_bloques = {
            "colis_recupere",
            "en_livraison",
            *Course.STATUTS_TERMINAUX,
        }
        return bool(
            request
            and request.user.is_authenticated
            and obj.statut not in statuts_bloques
            and (
                obj.vendeur.utilisateur_id == request.user.id
                or (
                    obj.livreur_id
                    and obj.livreur.utilisateur_id == request.user.id
                )
            )
        )

    def get_informations_masquees(self, obj):
        return self._est_masque(obj)


class TransitionStatutSerializer(serializers.Serializer):
    statut = serializers.ChoiceField(
        choices=[
            "en_route_retrait",
            "arrive_retrait",
            "colis_recupere",
            "en_livraison",
            "echec",
        ]
    )
    commentaire = serializers.CharField(
        max_length=500, required=False, allow_blank=True
    )


class ConfirmationPinSerializer(serializers.Serializer):
    pin = serializers.RegexField(r"^\d{4}$")
    preuve = serializers.ImageField(required=False)


class AnnulationSerializer(serializers.Serializer):
    motif = serializers.CharField(min_length=3, max_length=500)


class NoteSerializer(serializers.Serializer):
    note = serializers.IntegerField(min_value=1, max_value=5)
    commentaire = serializers.CharField(
        max_length=1000, required=False, allow_blank=True
    )
