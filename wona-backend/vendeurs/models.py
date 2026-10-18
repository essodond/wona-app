import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Vendeur(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vendeur",
    )
    nom = models.CharField(max_length=150, blank=True)
    categorie = models.CharField(max_length=120, blank=True)
    adresse = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    logo = models.ImageField(upload_to="vendeurs/logos/", null=True, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    note_moyenne = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    nombre_avis = models.PositiveIntegerField(default=0)
    cree_le = models.DateTimeField(default=timezone.now, editable=False)

    def __str__(self):
        return self.nom or self.utilisateur.telephone


class AdresseRetrait(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendeur = models.ForeignKey(
        Vendeur,
        on_delete=models.CASCADE,
        related_name="adresses_retrait",
    )
    libelle = models.CharField(max_length=80)
    adresse = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    indications = models.CharField(max_length=500, blank=True)
    par_defaut = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-par_defaut", "libelle"]
        constraints = [
            models.UniqueConstraint(
                fields=["vendeur", "libelle"],
                name="adresse_retrait_libelle_unique_par_vendeur",
            )
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.par_defaut:
            AdresseRetrait.objects.filter(vendeur=self.vendeur).exclude(
                pk=self.pk
            ).update(par_defaut=False)
