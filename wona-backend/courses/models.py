import uuid

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from livreurs.models import Livreur
from vendeurs.models import Vendeur


def generer_reference():
    return f"WNA-{timezone.now():%y%m}-{uuid.uuid4().hex[:6].upper()}"


class Course(models.Model):
    STATUT_CHOICES = [
        ("brouillon", "Brouillon"),
        ("en_attente", "En attente de livreur"),
        ("acceptee", "Acceptée"),
        ("en_route_retrait", "Livreur en route vers le vendeur"),
        ("arrive_retrait", "Arrivé au point de récupération"),
        ("colis_recupere", "Colis récupéré"),
        ("en_livraison", "Livraison en cours"),
        ("livree", "Livrée"),
        ("echec", "Échec de livraison"),
        ("annulee_vendeur", "Annulée par le vendeur"),
        ("annulee_livreur", "Annulée par le livreur"),
        ("litige", "Litige ou problème signalé"),
    ]
    STATUTS_TERMINAUX = {
        "livree",
        "annulee_vendeur",
        "annulee_livreur",
        "litige",
    }
    URGENCES = [
        ("normale", "Normale"),
        ("urgente", "Urgente"),
        ("express", "Express"),
    ]
    TAILLES = [
        ("petit", "Petit, moins de 1 kg"),
        ("moyen", "Moyen, 1 à 5 kg"),
        ("grand", "Grand, 5 à 15 kg"),
        ("tres_grand", "Très grand, plus de 15 kg"),
    ]
    METHODES_PAIEMENT = [
        ("especes", "Espèces"),
        ("tmoney", "TMoney"),
        ("flooz", "Flooz"),
        ("direct", "Paiement direct"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(
        max_length=24, unique=True, editable=False, default=generer_reference
    )
    vendeur = models.ForeignKey(
        Vendeur, on_delete=models.PROTECT, related_name="courses"
    )
    livreur = models.ForeignKey(
        Livreur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="courses",
    )
    destinataire_nom = models.CharField(max_length=150, default="Destinataire")
    destinataire_telephone = models.CharField(max_length=20, default="+22800000000")
    adresse_depart = models.TextField(max_length=2048)
    zone_depart = models.CharField(max_length=120, blank=True)
    depart_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    depart_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    adresse_arrivee = models.TextField(max_length=2048)
    zone_arrivee = models.CharField(max_length=120, blank=True)
    arrivee_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    arrivee_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    distance_estimee_km = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    description_colis = models.TextField()
    taille_colis = models.CharField(
        max_length=20, choices=TAILLES, default="petit"
    )
    instructions = models.TextField(blank=True)
    photo_colis = models.ImageField(
        upload_to="courses/colis/", null=True, blank=True
    )
    prix_livraison = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        default=0,
        validators=[MinValueValidator(0)],
    )
    montant_a_recuperer = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        validators=[MinValueValidator(0)],
    )
    methode_paiement = models.CharField(
        max_length=20, choices=METHODES_PAIEMENT, default="especes"
    )
    urgence = models.CharField(max_length=15, choices=URGENCES, default="normale")
    statut = models.CharField(
        max_length=24, choices=STATUT_CHOICES, default="brouillon", db_index=True
    )
    code_pin_hash = models.CharField(max_length=128, blank=True)
    code_pin_apercu = models.CharField(max_length=2, blank=True)
    remise_confirmee_par_vendeur = models.BooleanField(default=False)
    remise_confirmee_le = models.DateTimeField(null=True, blank=True)
    preuve_livraison = models.ImageField(
        upload_to="courses/preuves/", null=True, blank=True
    )
    motif_annulation = models.CharField(max_length=500, blank=True)
    motif_echec = models.CharField(max_length=500, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    publiee_le = models.DateTimeField(null=True, blank=True)
    acceptee_le = models.DateTimeField(null=True, blank=True)
    recuperee_le = models.DateTimeField(null=True, blank=True)
    livree_le = models.DateTimeField(null=True, blank=True)
    date_livraison = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-date_creation"]
        indexes = [
            models.Index(fields=["statut", "-date_creation"]),
            models.Index(fields=["vendeur", "statut"]),
            models.Index(fields=["livreur", "statut"]),
            models.Index(fields=["zone_depart", "statut"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(prix_livraison__gte=0),
                name="course_prix_livraison_positif",
            ),
            models.CheckConstraint(
                condition=models.Q(montant_a_recuperer__gte=0),
                name="course_montant_recuperer_positif",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"WNA-{timezone.now():%y%m}-{str(self.id)[:6].upper()}"
        super().save(*args, **kwargs)

    def definir_pin(self, pin):
        self.code_pin_hash = make_password(str(pin))
        self.code_pin_apercu = str(pin)[-2:]

    def verifier_pin(self, pin):
        return bool(self.code_pin_hash and check_password(str(pin), self.code_pin_hash))

    def __str__(self):
        return self.reference


class HistoriqueStatut(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="historique_statuts"
    )
    ancien_statut = models.CharField(max_length=24, blank=True)
    nouveau_statut = models.CharField(max_length=24)
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="changements_statut_course",
    )
    commentaire = models.CharField(max_length=500, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date_creation"]
        indexes = [models.Index(fields=["course", "date_creation"])]


class Paiement(models.Model):
    TYPES = [
        ("livraison", "Prix de livraison"),
        ("encaissement", "Montant à récupérer"),
        ("commission", "Commission Wona"),
    ]
    STATUTS = [
        ("non_paye", "Non payé"),
        ("en_attente", "En attente"),
        ("paye", "Payé"),
        ("rembourse", "Remboursé"),
        ("conteste", "Contesté"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course, on_delete=models.PROTECT, related_name="paiements"
    )
    type = models.CharField(max_length=20, choices=TYPES)
    montant = models.DecimalField(
        max_digits=12, decimal_places=0, validators=[MinValueValidator(0)]
    )
    methode = models.CharField(
        max_length=20, choices=Course.METHODES_PAIEMENT, default="especes"
    )
    reference = models.CharField(max_length=120, blank=True)
    statut = models.CharField(max_length=20, choices=STATUTS, default="non_paye")
    date_creation = models.DateTimeField(auto_now_add=True)
    paye_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-date_creation"]
        constraints = [
            models.UniqueConstraint(
                fields=["course", "type"],
                name="paiement_type_unique_par_course",
            )
        ]


class Avis(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="avis")
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="avis_rediges",
        null=True,
    )
    utilisateur_evalue = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="avis_recus",
        null=True,
    )
    note = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    commentaire = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_creation"]
        constraints = [
            models.UniqueConstraint(
                fields=["course", "auteur"],
                name="un_avis_par_auteur_et_course",
            )
        ]


class Signalement(models.Model):
    MOTIFS = [
        ("adresse_introuvable", "Adresse introuvable"),
        ("destinataire_absent", "Destinataire indisponible"),
        ("paiement", "Problème de paiement"),
        ("colis", "Problème avec le colis"),
        ("comportement", "Comportement inapproprié"),
        ("accident", "Panne ou accident"),
        ("autre", "Autre"),
    ]
    STATUTS = [
        ("ouvert", "Ouvert"),
        ("en_cours", "En cours"),
        ("resolu", "Résolu"),
        ("rejete", "Rejeté"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="signalements"
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="signalements_crees",
    )
    motif = models.CharField(max_length=30, choices=MOTIFS)
    description = models.TextField()
    preuve = models.FileField(
        upload_to="courses/signalements/", null=True, blank=True
    )
    statut = models.CharField(max_length=20, choices=STATUTS, default="ouvert")
    assigne_a = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="signalements_assignes",
    )
    resolution = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    resolu_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-date_creation"]


class MessageCourse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="messages"
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messages_courses",
    )
    contenu = models.CharField(max_length=500)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date_creation"]
