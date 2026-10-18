from rest_framework import serializers

from .models import AdresseRetrait, Vendeur


class AdresseRetraitSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdresseRetrait
        fields = [
            "id",
            "libelle",
            "adresse",
            "latitude",
            "longitude",
            "indications",
            "par_defaut",
            "active",
            "cree_le",
        ]
        read_only_fields = ["id", "cree_le"]


class VendeurSerializer(serializers.ModelSerializer):
    telephone = serializers.CharField(source="utilisateur.telephone", read_only=True)
    adresses_retrait = serializers.SerializerMethodField()

    class Meta:
        model = Vendeur
        fields = [
            "id",
            "nom",
            "telephone",
            "categorie",
            "adresse",
            "latitude",
            "longitude",
            "logo",
            "whatsapp",
            "note_moyenne",
            "nombre_avis",
            "adresses_retrait",
            "cree_le",
        ]
        read_only_fields = [
            "id",
            "telephone",
            "note_moyenne",
            "nombre_avis",
            "adresses_retrait",
            "cree_le",
        ]

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if instance.nom and instance.utilisateur.nom_complet != instance.nom:
            instance.utilisateur.nom_complet = instance.nom
            instance.utilisateur.save(update_fields=["nom_complet"])
        return instance

    def get_adresses_retrait(self, obj):
        return AdresseRetraitSerializer(
            obj.adresses_retrait.filter(active=True), many=True
        ).data
