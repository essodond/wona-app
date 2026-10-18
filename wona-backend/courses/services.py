from django.db import transaction
from django.db.models import Avg, Count
from django.utils import timezone
from rest_framework import serializers

from core.models import ParametresPlateforme
from core.utils import journaliser, notifier

from .models import Course, HistoriqueStatut, Paiement


TRANSITIONS_AUTORISEES = {
    "brouillon": {"en_attente", "annulee_vendeur", "litige"},
    "en_attente": {"acceptee", "annulee_vendeur", "litige"},
    "acceptee": {
        "en_route_retrait", "annulee_vendeur", "annulee_livreur", "litige"
    },
    "en_route_retrait": {
        "arrive_retrait", "annulee_vendeur", "annulee_livreur", "litige"
    },
    "arrive_retrait": {
        "colis_recupere", "annulee_vendeur", "annulee_livreur", "litige"
    },
    "colis_recupere": {"en_livraison", "echec", "litige"},
    "en_livraison": {"livree", "echec", "litige"},
    "echec": {"en_livraison", "litige"},
}


def creer_historique(course, utilisateur, ancien, nouveau, commentaire=""):
    return HistoriqueStatut.objects.create(
        course=course,
        utilisateur=utilisateur,
        ancien_statut=ancien,
        nouveau_statut=nouveau,
        commentaire=commentaire[:500],
    )


def creer_paiements(course):
    Paiement.objects.get_or_create(
        course=course,
        type="livraison",
        defaults={"montant": course.prix_livraison, "methode": course.methode_paiement},
    )
    if course.montant_a_recuperer:
        Paiement.objects.get_or_create(
            course=course,
            type="encaissement",
            defaults={
                "montant": course.montant_a_recuperer,
                "methode": course.methode_paiement,
            },
        )
    params = ParametresPlateforme.charger()
    commission = max(
        params.commission_fixe,
        course.prix_livraison * params.commission_pourcentage / 100,
    )
    Paiement.objects.get_or_create(
        course=course,
        type="commission",
        defaults={"montant": round(commission), "methode": course.methode_paiement},
    )


@transaction.atomic
def accepter_course(course_id, request):
    livreur = (
        request.user.livreur.__class__.objects.select_for_update()
        .select_related("utilisateur")
        .get(pk=request.user.livreur.pk)
    )
    if (
        livreur.statut_verification != "valide"
        or livreur.statut_disponibilite != "disponible"
        or not livreur.utilisateur.is_active
    ):
        raise serializers.ValidationError(
            "Le livreur doit être validé et disponible."
        )
    course = Course.objects.select_for_update(of=("self",)).select_related(
        "vendeur__utilisateur"
    ).get(pk=course_id)
    if course.statut != "en_attente" or course.livreur_id is not None:
        raise serializers.ValidationError("Cette livraison n'est plus disponible.")
    if Course.objects.filter(
        livreur=livreur,
        statut__in=[
            "acceptee",
            "en_route_retrait",
            "arrive_retrait",
            "colis_recupere",
            "en_livraison",
        ],
    ).exists():
        raise serializers.ValidationError(
            "Terminez votre livraison active avant d'en accepter une autre."
        )

    ancien = course.statut
    course.livreur = livreur
    course.statut = "acceptee"
    course.acceptee_le = timezone.now()
    course.save(update_fields=["livreur", "statut", "acceptee_le", "date_modification"])
    livreur.statut_disponibilite = "en_livraison"
    livreur.save(update_fields=["statut_disponibilite"])
    creer_historique(course, request.user, ancien, course.statut)
    notifier(
        course.vendeur.utilisateur,
        "Un livreur a accepté votre demande",
        f"{livreur.nom} prend en charge la livraison {course.reference}.",
        "course",
        {"course_id": str(course.id), "statut": course.statut},
    )
    journaliser(request, "course.acceptee", course)
    return course


@transaction.atomic
def changer_statut_course(course_id, request, nouveau_statut, commentaire=""):
    course = Course.objects.select_for_update(of=("self",)).select_related(
        "vendeur__utilisateur", "livreur__utilisateur"
    ).get(pk=course_id)
    user = request.user
    est_vendeur = user.role == "vendeur" and course.vendeur.utilisateur_id == user.id
    est_livreur = (
        user.role == "livreur"
        and course.livreur_id
        and course.livreur.utilisateur_id == user.id
    )
    if not (est_vendeur or est_livreur or user.is_staff):
        raise serializers.ValidationError("Vous ne participez pas à cette livraison.")
    if (
        nouveau_statut not in TRANSITIONS_AUTORISEES.get(course.statut, set())
        and not user.is_staff
    ):
        raise serializers.ValidationError(
            f"Transition interdite : {course.statut} → {nouveau_statut}."
        )
    if nouveau_statut in {
        "en_route_retrait",
        "arrive_retrait",
        "colis_recupere",
        "en_livraison",
        "echec",
    } and not (est_livreur or user.is_staff):
        raise serializers.ValidationError(
            "Seul le livreur assigné peut effectuer cette étape."
        )
    if nouveau_statut == "colis_recupere" and not course.remise_confirmee_par_vendeur:
        raise serializers.ValidationError(
            "Le vendeur doit d'abord confirmer la remise du colis."
        )
    if nouveau_statut == "livree":
        raise serializers.ValidationError(
            "Utilisez la confirmation par code PIN pour terminer la livraison."
        )
    if nouveau_statut.startswith("annulee"):
        if course.statut in {"colis_recupere", "en_livraison"}:
            raise serializers.ValidationError(
                "Après récupération, créez un incident ou un retour de colis."
            )
        attendu = "annulee_vendeur" if est_vendeur else "annulee_livreur"
        if nouveau_statut != attendu and not user.is_staff:
            raise serializers.ValidationError("Type d'annulation incorrect.")
        if not commentaire.strip():
            raise serializers.ValidationError(
                {"commentaire": "Le motif de l'annulation est obligatoire."}
            )

    ancien = course.statut
    course.statut = nouveau_statut
    if nouveau_statut == "en_attente" and not course.publiee_le:
        course.publiee_le = timezone.now()
    elif nouveau_statut == "colis_recupere":
        course.recuperee_le = timezone.now()
    elif nouveau_statut == "echec":
        course.motif_echec = commentaire[:500]
    elif nouveau_statut.startswith("annulee"):
        course.motif_annulation = commentaire[:500]
    course.save()
    creer_historique(course, user, ancien, nouveau_statut, commentaire)

    if course.livreur_id:
        destinataires = {
            course.vendeur.utilisateur_id: course.vendeur.utilisateur,
            course.livreur.utilisateur_id: course.livreur.utilisateur,
        }
        destinataires.pop(user.id, None)
        for destinataire in destinataires.values():
            notifier(
                destinataire,
                "Mise à jour de la livraison",
                f"{course.reference} est maintenant « {course.get_statut_display()} ».",
                "course",
                {"course_id": str(course.id), "statut": course.statut},
            )
    journaliser(
        request,
        "course.statut_modifie",
        course,
        {"ancien": ancien, "nouveau": nouveau_statut},
    )
    return course


@transaction.atomic
def confirmer_livraison_pin(course_id, request, pin, preuve=None):
    course = Course.objects.select_for_update(of=("self",)).select_related(
        "vendeur__utilisateur", "livreur__utilisateur"
    ).get(pk=course_id)
    if (
        request.user.role != "livreur"
        or not course.livreur_id
        or course.livreur.utilisateur_id != request.user.id
    ):
        raise serializers.ValidationError("Seul le livreur assigné peut confirmer.")
    if course.statut != "en_livraison":
        raise serializers.ValidationError(
            "La livraison doit être au statut « Livraison en cours »."
        )
    if not course.verifier_pin(pin):
        raise serializers.ValidationError({"pin": "Code PIN incorrect."})

    ancien = course.statut
    course.statut = "livree"
    course.livree_le = timezone.now()
    course.date_livraison = course.livree_le
    if preuve:
        course.preuve_livraison = preuve
    course.save()
    creer_historique(course, request.user, ancien, "livree", "PIN vérifié")
    course.livreur.statut_disponibilite = "disponible"
    course.livreur.save(update_fields=["statut_disponibilite"])
    course.paiements.filter(type="livraison").update(
        statut="paye", paye_le=timezone.now()
    )
    notifier(
        course.vendeur.utilisateur,
        "Livraison terminée",
        f"Le colis {course.reference} a été remis avec succès.",
        "course",
        {"course_id": str(course.id), "statut": "livree"},
    )
    journaliser(request, "course.livree", course)
    return course


def recalculer_note(utilisateur):
    agregat = utilisateur.avis_recus.aggregate(
        moyenne=Avg("note"), nombre=Count("id")
    )
    profil = (
        utilisateur.livreur
        if utilisateur.role == "livreur"
        else utilisateur.vendeur
    )
    profil.note_moyenne = round(agregat["moyenne"] or 0, 2)
    profil.nombre_avis = agregat["nombre"] or 0
    profil.save(update_fields=["note_moyenne", "nombre_avis"])
