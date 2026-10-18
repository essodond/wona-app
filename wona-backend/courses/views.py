import secrets

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from core.permissions import EstLivreurValide, EstVendeur
from core.utils import journaliser, notifier

from .models import Avis, Course, Signalement
from .serializers import (
    AnnulationSerializer,
    ConfirmationPinSerializer,
    CourseDisponibleSerializer,
    CourseSerializer,
    MessageCourseSerializer,
    NoteSerializer,
    SignalementSerializer,
    TransitionStatutSerializer,
)
from .services import (
    accepter_course,
    changer_statut_course,
    confirmer_livraison_pin,
    creer_historique,
    creer_paiements,
    recalculer_note,
)


class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CourseSerializer
    throttle_scope = None
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        base = Course.objects.select_related(
            "vendeur__utilisateur",
            "livreur__utilisateur",
        ).prefetch_related(
            "historique_statuts__utilisateur",
            "paiements",
            "avis__auteur",
        )
        if user.is_staff:
            return base
        if user.role == "vendeur" and hasattr(user, "vendeur"):
            return base.filter(vendeur=user.vendeur)
        if user.role == "livreur" and hasattr(user, "livreur"):
            return base.filter(
                Q(livreur=user.livreur)
                | Q(statut="en_attente", livreur__isnull=True)
            )
        return base.none()

    def get_permissions(self):
        if self.action == "create":
            return [EstVendeur()]
        if self.action in {"disponibles", "accepter"}:
            return [EstLivreurValide()]
        return super().get_permissions()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        publier = request.data.get("publier", True) not in {False, "false", "0", 0}
        pin = f"{secrets.randbelow(10_000):04d}"
        course = serializer.save(
            vendeur=request.user.vendeur,
            statut="en_attente" if publier else "brouillon",
            publiee_le=timezone.now() if publier else None,
        )
        course.definir_pin(pin)
        course.save(update_fields=["code_pin_hash", "code_pin_apercu"])
        creer_historique(
            course, request.user, "", course.statut, "Création de la demande"
        )
        creer_paiements(course)
        journaliser(request, "course.creee", course)
        response_data = self.get_serializer(course).data
        response_data["code_pin_livraison"] = pin
        return Response(response_data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        course = self.get_object()
        if (
            request.user.role != "vendeur"
            or course.vendeur.utilisateur_id != request.user.id
            or course.livreur_id is not None
            or course.statut not in {"brouillon", "en_attente"}
        ):
            raise serializers.ValidationError(
                "Cette livraison ne peut plus être modifiée."
            )
        response = super().update(request, *args, **kwargs)
        journaliser(request, "course.modifiee", course)
        return response

    @action(detail=False, methods=["get"])
    def disponibles(self, request):
        livreur = request.user.livreur
        if livreur.statut_disponibilite != "disponible":
            return Response([])
        queryset = Course.objects.filter(
            statut="en_attente", livreur__isnull=True
        ).select_related("vendeur")
        zone = request.query_params.get("zone")
        prix_min = request.query_params.get("prix_min")
        if zone:
            queryset = queryset.filter(zone_depart__icontains=zone)
        if prix_min:
            queryset = queryset.filter(prix_livraison__gte=prix_min)
        page = self.paginate_queryset(queryset)
        serializer = CourseDisponibleSerializer(
            page if page is not None else queryset,
            many=True,
            context={"request": request},
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def publier(self, request, pk=None):
        course = self.get_object()
        if (
            request.user.role != "vendeur"
            or course.vendeur.utilisateur_id != request.user.id
        ):
            raise serializers.ValidationError("Action réservée au vendeur.")
        course = changer_statut_course(course.id, request, "en_attente")
        return Response(self.get_serializer(course).data)

    @action(detail=True, methods=["post"])
    def accepter(self, request, pk=None):
        course = accepter_course(pk, request)
        return Response(self.get_serializer(course).data)

    @action(detail=True, methods=["post"])
    def confirmer_remise(self, request, pk=None):
        with transaction.atomic():
            course = Course.objects.select_for_update(of=("self",)).select_related(
                "livreur__utilisateur"
            ).get(pk=pk)
            if (
                request.user.role != "vendeur"
                or course.vendeur.utilisateur_id != request.user.id
            ):
                raise serializers.ValidationError("Action réservée au vendeur.")
            if course.statut != "arrive_retrait":
                raise serializers.ValidationError(
                    "Le livreur doit être arrivé au point de récupération."
                )
            course.remise_confirmee_par_vendeur = True
            course.remise_confirmee_le = timezone.now()
            course.save(
                update_fields=[
                    "remise_confirmee_par_vendeur",
                    "remise_confirmee_le",
                    "date_modification",
                ]
            )
            if course.livreur_id:
                notifier(
                    course.livreur.utilisateur,
                    "Colis prêt à partir",
                    f"Le vendeur a confirmé la remise de {course.reference}.",
                    "course",
                    {"course_id": str(course.id)},
                )
            journaliser(request, "course.remise_confirmee", course)
        return Response(self.get_serializer(course).data)

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        serializer = TransitionStatutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = changer_statut_course(
            pk,
            request,
            serializer.validated_data["statut"],
            serializer.validated_data.get("commentaire", ""),
        )
        return Response(self.get_serializer(course).data)

    @action(
        detail=True,
        methods=["post"],
        throttle_classes=[ScopedRateThrottle],
        throttle_scope="delivery_pin",
    )
    def confirmer_livraison(self, request, pk=None):
        serializer = ConfirmationPinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = confirmer_livraison_pin(
            pk,
            request,
            serializer.validated_data["pin"],
            serializer.validated_data.get("preuve"),
        )
        return Response(self.get_serializer(course).data)

    @action(detail=True, methods=["post"])
    def annuler(self, request, pk=None):
        serializer = AnnulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = self.get_object()
        if request.user.role == "vendeur":
            nouveau = "annulee_vendeur"
        elif request.user.role == "livreur":
            nouveau = "annulee_livreur"
        else:
            raise serializers.ValidationError("Rôle non autorisé.")
        course = changer_statut_course(
            course.id, request, nouveau, serializer.validated_data["motif"]
        )
        if course.livreur_id:
            course.livreur.statut_disponibilite = "disponible"
            course.livreur.save(update_fields=["statut_disponibilite"])
        return Response(self.get_serializer(course).data)

    @action(detail=True, methods=["post"])
    def regenerer_pin(self, request, pk=None):
        course = self.get_object()
        if (
            request.user.role != "vendeur"
            or course.vendeur.utilisateur_id != request.user.id
            or course.statut in Course.STATUTS_TERMINAUX
        ):
            raise serializers.ValidationError("Impossible de régénérer ce code.")
        pin = f"{secrets.randbelow(10_000):04d}"
        course.definir_pin(pin)
        course.save(update_fields=["code_pin_hash", "code_pin_apercu"])
        journaliser(request, "course.pin_regenere", course)
        return Response(
            {"code_pin_livraison": pin, "code_pin_apercu": course.code_pin_apercu}
        )

    @action(detail=True, methods=["post"])
    def dupliquer(self, request, pk=None):
        source = self.get_object()
        if (
            request.user.role != "vendeur"
            or source.vendeur.utilisateur_id != request.user.id
        ):
            raise serializers.ValidationError("Action réservée au vendeur.")
        noms_champs = [
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
            "prix_livraison",
            "montant_a_recuperer",
            "methode_paiement",
            "urgence",
        ]
        with transaction.atomic():
            copie = Course.objects.create(
                vendeur=request.user.vendeur,
                statut="brouillon",
                **{nom: getattr(source, nom) for nom in noms_champs},
            )
            pin = f"{secrets.randbelow(10_000):04d}"
            copie.definir_pin(pin)
            copie.save(update_fields=["code_pin_hash", "code_pin_apercu"])
            creer_historique(
                copie, request.user, "", "brouillon", f"Copie de {source.reference}"
            )
            creer_paiements(copie)
        data = self.get_serializer(copie).data
        data["code_pin_livraison"] = pin
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def noter(self, request, pk=None):
        course = self.get_object()
        if course.statut != "livree":
            raise serializers.ValidationError(
                "La notation est disponible après la livraison."
            )
        serializer = NoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if (
            request.user.role == "vendeur"
            and course.vendeur.utilisateur_id == request.user.id
            and course.livreur_id
        ):
            evalue = course.livreur.utilisateur
        elif (
            request.user.role == "livreur"
            and course.livreur_id
            and course.livreur.utilisateur_id == request.user.id
        ):
            evalue = course.vendeur.utilisateur
        else:
            raise serializers.ValidationError("Vous ne participez pas à cette course.")
        avis, cree = Avis.objects.update_or_create(
            course=course,
            auteur=request.user,
            defaults={"utilisateur_evalue": evalue, **serializer.validated_data},
        )
        recalculer_note(evalue)
        journaliser(request, "course.notee", avis)
        return Response(
            self.get_serializer(course).data,
            status=status.HTTP_201_CREATED if cree else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get", "post"])
    def signalements(self, request, pk=None):
        course = self.get_object()
        if request.method == "GET":
            return Response(
                SignalementSerializer(course.signalements.all(), many=True).data
            )
        serializer = SignalementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        signalement = serializer.save(course=course, auteur=request.user)
        if course.statut not in Course.STATUTS_TERMINAUX:
            changer_statut_course(
                course.id,
                request,
                "litige",
                f"Signalement : {signalement.get_motif_display()}",
            )
        journaliser(request, "course.signalee", signalement)
        return Response(
            SignalementSerializer(signalement).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        course = self.get_object()
        if not course.livreur_id:
            raise serializers.ValidationError(
                "La messagerie s'ouvre après l'acceptation."
            )
        if request.method == "GET":
            return Response(
                MessageCourseSerializer(course.messages.all(), many=True).data
            )
        serializer = MessageCourseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(course=course, auteur=request.user)
        autre = (
            course.livreur.utilisateur
            if request.user.role == "vendeur"
            else course.vendeur.utilisateur
        )
        notifier(
            autre,
            "Nouveau message",
            message.contenu,
            "course",
            {"course_id": str(course.id)},
        )
        return Response(
            MessageCourseSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"])
    def statistiques(self, request):
        queryset = self.get_queryset()
        if request.user.role == "livreur":
            queryset = queryset.filter(livreur=request.user.livreur)
        terminees = queryset.filter(statut="livree")
        return Response(
            {
                "total": queryset.count(),
                "livrees": terminees.count(),
                "annulees": queryset.filter(
                    statut__in=["annulee_vendeur", "annulee_livreur"]
                ).count(),
                "en_cours": queryset.exclude(
                    statut__in=Course.STATUTS_TERMINAUX
                ).exclude(statut__in=["brouillon", "en_attente"]).count(),
                "montant_livraisons": terminees.aggregate(
                    total=Sum("prix_livraison")
                )["total"]
                or 0,
            }
        )
