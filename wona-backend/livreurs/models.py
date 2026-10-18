import uuid

from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models


def valider_taille_document(fichier):
    limite = 5 * 1024 * 1024
    if fichier.size > limite:
        from django.core.exceptions import ValidationError

        raise ValidationError("Le document ne doit pas dépasser 5 Mo.")


class Livreur(models.Model):
    STATUT_VERIFICATION = [
        ("en_attente", "En attente"),
        ("valide", "Validé"),
        ("refuse", "Refusé"),
        ("suspendu", "Suspendu"),
    ]
    STATUT_DISPONIBILITE = [
        ("disponible", "Disponible"),
        ("en_livraison", "En livraison"),
        ("hors_ligne", "Hors ligne"),
    ]
    MOYENS_TRANSPORT = [
        ("moto", "Moto"),
        ("velo", "Vélo"),
        ("voiture", "Voiture"),
        ("tricycle", "Tricycle"),
        ("autre", "Autre"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="livreur",
    )
    nom = models.CharField(max_length=150, blank=True)
    ville = models.CharField(max_length=120, default="Lomé")
    moyen_transport = models.CharField(
        max_length=20,
        choices=MOYENS_TRANSPORT,
        default="moto",
    )
    immatriculation_moto = models.CharField(max_length=50, blank=True)
    photo = models.ImageField(upload_to="livreurs/profils/", null=True, blank=True)
    statut_verification = models.CharField(
        max_length=15,
        choices=STATUT_VERIFICATION,
        default="en_attente",
        db_index=True,
    )
    statut_disponibilite = models.CharField(
        max_length=15,
        choices=STATUT_DISPONIBILITE,
        default="hors_ligne",
        db_index=True,
    )
    commentaire_verification = models.CharField(max_length=500, blank=True)
    verifie_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="livreurs_verifies",
    )
    verifie_le = models.DateTimeField(null=True, blank=True)
    note_moyenne = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    nombre_avis = models.PositiveIntegerField(default=0)
    date_inscription = models.DateTimeField(auto_now_add=True)
    derniere_position_lat = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    derniere_position_lng = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    position_mise_a_jour_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["statut_verification", "statut_disponibilite"]),
            models.Index(fields=["ville", "statut_disponibilite"]),
        ]

    def __str__(self):
        return self.nom or self.utilisateur.telephone


class Document(models.Model):
    TYPE_CHOICES = [
        ("cni", "Pièce d'identité"),
        ("permis", "Permis de conduire"),
        ("carte_grise", "Carte grise"),
        ("photo_livreur", "Photo du livreur"),
        ("photo_vehicule", "Photo avec le véhicule"),
    ]
    STATUT_CHOICES = [
        ("en_attente", "En attente"),
        ("valide", "Validé"),
        ("refuse", "Refusé"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    livreur = models.ForeignKey(
        Livreur,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    fichier = models.FileField(
        upload_to="documents/livreurs/",
        validators=[
            FileExtensionValidator(["jpg", "jpeg", "png", "pdf"]),
            valider_taille_document,
        ],
    )
    statut = models.CharField(
        max_length=15,
        choices=STATUT_CHOICES,
        default="en_attente",
    )
    commentaire_admin = models.CharField(max_length=500, blank=True)
    date_televersement = models.DateTimeField(auto_now_add=True)
    verifie_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents_livreurs_verifies",
    )
    verifie_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["livreur", "type"],
                name="document_type_unique_par_livreur",
            )
        ]
        ordering = ["type"]


class Abonnement(models.Model):
    PALIER_CHOICES = [("standard", "Standard"), ("premium", "Premium")]
    STATUT_CHOICES = [("actif", "Actif"), ("expire", "Expiré")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    livreur = models.ForeignKey(
        Livreur,
        on_delete=models.CASCADE,
        related_name="abonnements",
    )
    palier = models.CharField(max_length=10, choices=PALIER_CHOICES)
    date_debut = models.DateField()
    date_fin = models.DateField()
    statut = models.CharField(
        max_length=10,
        choices=STATUT_CHOICES,
        default="actif",
    )
