import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from .managers import UtilisateurManager


class Utilisateur(AbstractUser):
    ROLE_CHOICES = [
        ("vendeur", "Vendeur"),
        ("livreur", "Livreur"),
        ("admin", "Administrateur"),
    ]

    username = None
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    telephone = models.CharField(max_length=20, unique=True, db_index=True)
    nom_complet = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    telephone_verifie = models.BooleanField(default=False)
    photo = models.ImageField(upload_to="profils/", null=True, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)

    USERNAME_FIELD = "telephone"
    REQUIRED_FIELDS = []
    objects = UtilisateurManager()

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self):
        return f"{self.telephone} ({self.role})"


class CodeOTP(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    telephone = models.CharField(max_length=20, db_index=True)
    code = models.CharField(max_length=128)
    role = models.CharField(
        max_length=10, choices=Utilisateur.ROLE_CHOICES, default="vendeur"
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    expire_le = models.DateTimeField(default=timezone.now)
    utilise = models.BooleanField(default=False)
    utilise_le = models.DateTimeField(null=True, blank=True)
    tentatives = models.PositiveSmallIntegerField(default=0)
    adresse_ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-date_creation"]
        indexes = [
            models.Index(fields=["telephone", "role", "-date_creation"]),
        ]

    @property
    def est_valide(self):
        return (
            not self.utilise
            and self.tentatives < 5
            and self.expire_le > timezone.now()
        )


class AppareilNotification(models.Model):
    PLATEFORMES = [
        ("android", "Android"),
        ("ios", "iOS"),
        ("web", "Web"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name="appareils_notification",
    )
    jeton = models.CharField(max_length=255, unique=True)
    plateforme = models.CharField(max_length=10, choices=PLATEFORMES)
    actif = models.BooleanField(default=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["utilisateur", "actif"])]
