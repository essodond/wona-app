import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class HorodatageModel(models.Model):
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Notification(models.Model):
    TYPES = [
        ("course", "Livraison"),
        ("paiement", "Paiement"),
        ("compte", "Compte"),
        ("litige", "Litige"),
        ("systeme", "Système"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=20, choices=TYPES, default="systeme")
    titre = models.CharField(max_length=160)
    message = models.TextField()
    donnees = models.JSONField(default=dict, blank=True)
    lu_le = models.DateTimeField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cree_le"]
        indexes = [
            models.Index(fields=["utilisateur", "-cree_le"]),
            models.Index(fields=["utilisateur", "lu_le"]),
        ]


class JournalAudit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="actions_auditees",
    )
    action = models.CharField(max_length=100)
    cible_type = models.CharField(max_length=80, blank=True)
    cible_id = models.CharField(max_length=80, blank=True)
    details = models.JSONField(default=dict, blank=True)
    adresse_ip = models.GenericIPAddressField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cree_le"]
        indexes = [
            models.Index(fields=["action", "-cree_le"]),
            models.Index(fields=["cible_type", "cible_id"]),
        ]


class Zone(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField(max_length=120, unique=True)
    ville = models.CharField(max_length=120, default="Lomé")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    rayon_km = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=10,
        validators=[MinValueValidator(0.1), MaxValueValidator(500)],
    )
    active = models.BooleanField(default=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["ville", "nom"]

    def __str__(self):
        return f"{self.nom} — {self.ville}"


class ParametresPlateforme(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    commission_pourcentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=10,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    commission_fixe = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        default=0,
        validators=[MinValueValidator(0)],
    )
    telephone_support = models.CharField(max_length=20, blank=True)
    whatsapp_support = models.CharField(max_length=20, blank=True)
    prix_livraison_minimum = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        default=300,
        validators=[MinValueValidator(0)],
    )
    modifie_le = models.DateTimeField(auto_now=True)

    @classmethod
    def charger(cls):
        instance, _ = cls.objects.get_or_create(pk=1)
        return instance

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
