from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Utilisateur
from courses.models import Course, Paiement, Signalement
from livreurs.models import Document, Livreur

from .models import JournalAudit, ParametresPlateforme, Zone
from .serializers import (
    AdminCourseSerializer,
    AdminDocumentSerializer,
    AdminLivreurSerializer,
    AdminPaiementSerializer,
    AdminSignalementSerializer,
    AdminUtilisateurSerializer,
    ParametresPlateformeSerializer,
    ZoneSerializer,
)
from .utils import journaliser, notifier


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "wona-api"})


class TableauDeBordAdminView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        aujourd_hui = timezone.localdate()
        courses = Course.objects.all()
        return Response(
            {
                "utilisateurs": Utilisateur.objects.filter(is_staff=False).count(),
                "vendeurs": Utilisateur.objects.filter(role="vendeur", is_active=True).count(),
                "livreurs": Livreur.objects.count(),
                "livreurs_en_attente": Livreur.objects.filter(
                    statut_verification="en_attente"
                ).count(),
                "courses_total": courses.count(),
                "courses_actives": courses.exclude(
                    statut__in=Course.STATUTS_TERMINAUX
                ).exclude(statut="brouillon").count(),
                "courses_livrees_aujourdhui": courses.filter(
                    statut="livree", livree_le__date=aujourd_hui
                ).count(),
                "litiges_ouverts": Signalement.objects.filter(
                    statut__in=["ouvert", "en_cours"]
                ).count(),
                "volume_livraisons": courses.filter(statut="livree").aggregate(
                    total=Sum("prix_livraison")
                )["total"]
                or 0,
                "repartition_statuts": list(
                    courses.values("statut")
                    .annotate(total=Count("id"))
                    .order_by("statut")
                ),
            }
        )


class AdminUtilisateurViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = AdminUtilisateurSerializer
    queryset = Utilisateur.objects.filter(is_staff=False).order_by("-date_joined")
    search_fields = ["telephone", "nom_complet"]

    @action(detail=True, methods=["post"])
    def suspendre(self, request, pk=None):
        utilisateur = self.get_object()
        utilisateur.is_active = False
        utilisateur.save(update_fields=["is_active"])
        journaliser(request, "utilisateur.suspendu", utilisateur)
        notifier(
            utilisateur,
            "Compte Wona suspendu",
            "Votre compte a été suspendu. Contactez le support Wona.",
            "compte",
        )
        return Response(self.get_serializer(utilisateur).data)

    @action(detail=True, methods=["post"])
    def reactiver(self, request, pk=None):
        utilisateur = self.get_object()
        utilisateur.is_active = True
        utilisateur.save(update_fields=["is_active"])
        journaliser(request, "utilisateur.reactive", utilisateur)
        notifier(
            utilisateur,
            "Compte Wona réactivé",
            "Votre compte est de nouveau actif.",
            "compte",
        )
        return Response(self.get_serializer(utilisateur).data)


class AdminLivreurViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = AdminLivreurSerializer
    queryset = (
        Livreur.objects.select_related("utilisateur")
        .prefetch_related("documents")
        .order_by("-date_inscription")
    )

    def _changer_statut(self, request, livreur, nouveau_statut):
        commentaire = str(request.data.get("commentaire", "")).strip()[:500]
        livreur.statut_verification = nouveau_statut
        livreur.commentaire_verification = commentaire
        livreur.verifie_par = request.user
        livreur.verifie_le = timezone.now()
        if nouveau_statut != "valide":
            livreur.statut_disponibilite = "hors_ligne"
        livreur.save(
            update_fields=[
                "statut_verification",
                "commentaire_verification",
                "verifie_par",
                "verifie_le",
                "statut_disponibilite",
            ]
        )
        journaliser(request, f"livreur.{nouveau_statut}", livreur)
        notifier(
            livreur.utilisateur,
            "Mise à jour de votre dossier livreur",
            (
                "Votre compte livreur est validé. Vous pouvez passer disponible."
                if nouveau_statut == "valide"
                else commentaire
                or f"Votre dossier livreur est maintenant « {nouveau_statut} »."
            ),
            "validation_livreur",
            {"statut": nouveau_statut},
        )
        return Response(self.get_serializer(livreur).data)

    @action(detail=True, methods=["post"])
    def valider(self, request, pk=None):
        livreur = self.get_object()
        types_requis = {
            "cni",
            "permis",
            "carte_grise",
            "photo_livreur",
            "photo_vehicule",
        }
        types_valides = set(
            livreur.documents.filter(statut="valide").values_list(
                "type", flat=True
            )
        )
        manquants = types_requis - types_valides
        if manquants:
            return Response(
                {
                    "documents": [
                        "Tous les documents requis doivent être validés avant "
                        "l'activation du livreur."
                    ],
                    "types_manquants": sorted(manquants),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._changer_statut(request, livreur, "valide")

    @action(detail=True, methods=["post"])
    def refuser(self, request, pk=None):
        return self._changer_statut(request, self.get_object(), "refuse")

    @action(detail=True, methods=["post"])
    def suspendre(self, request, pk=None):
        return self._changer_statut(request, self.get_object(), "suspendu")


class AdminDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = AdminDocumentSerializer
    queryset = Document.objects.select_related(
        "livreur", "livreur__utilisateur", "verifie_par"
    ).order_by("-date_televersement")

    @action(detail=True, methods=["post"])
    def examiner(self, request, pk=None):
        document = self.get_object()
        decision = request.data.get("statut")
        if decision not in {"valide", "refuse"}:
            return Response(
                {"statut": ["La décision doit être « valide » ou « refuse »."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        document.statut = decision
        document.commentaire_admin = str(request.data.get("commentaire", "")).strip()[:500]
        document.verifie_par = request.user
        document.verifie_le = timezone.now()
        document.save(
            update_fields=[
                "statut",
                "commentaire_admin",
                "verifie_par",
                "verifie_le",
            ]
        )
        journaliser(request, f"document.{decision}", document)
        notifier(
            document.livreur.utilisateur,
            f"Document {document.get_type_display()} examiné",
            document.commentaire_admin
            or f"Le document est maintenant « {document.get_statut_display()} ».",
            "validation_livreur",
            {"document_id": str(document.id), "statut": decision},
        )
        return Response(self.get_serializer(document).data)


class AdminCourseViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = AdminCourseSerializer
    queryset = Course.objects.select_related(
        "vendeur",
        "vendeur__utilisateur",
        "livreur",
        "livreur__utilisateur",
    ).order_by("-date_creation")

    def get_queryset(self):
        queryset = super().get_queryset()
        statut_course = self.request.query_params.get("statut")
        recherche = self.request.query_params.get("q")
        if statut_course:
            queryset = queryset.filter(statut=statut_course)
        if recherche:
            queryset = queryset.filter(
                Q(reference__icontains=recherche)
                | Q(destinataire_nom__icontains=recherche)
                | Q(adresse_depart__icontains=recherche)
                | Q(adresse_arrivee__icontains=recherche)
            )
        return queryset


class AdminSignalementViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = AdminSignalementSerializer
    queryset = Signalement.objects.select_related(
        "course", "auteur", "assigne_a"
    ).order_by("-date_creation")

    @action(detail=True, methods=["post"])
    def traiter(self, request, pk=None):
        signalement = self.get_object()
        nouveau_statut = request.data.get("statut")
        if nouveau_statut not in {"en_cours", "resolu", "rejete"}:
            return Response(
                {"statut": ["Statut de traitement invalide."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        signalement.statut = nouveau_statut
        signalement.assigne_a = request.user
        signalement.resolution = str(request.data.get("resolution", "")).strip()[:2000]
        if nouveau_statut in {"resolu", "rejete"}:
            signalement.resolu_le = timezone.now()
        signalement.save()
        journaliser(request, f"signalement.{nouveau_statut}", signalement)
        return Response(self.get_serializer(signalement).data)


class AdminPaiementViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = AdminPaiementSerializer
    queryset = Paiement.objects.select_related("course").order_by("-date_creation")

    @action(detail=True, methods=["post"])
    def mettre_a_jour(self, request, pk=None):
        paiement = self.get_object()
        nouveau_statut = request.data.get("statut")
        statuts_valides = {value for value, _ in Paiement.STATUTS}
        if nouveau_statut not in statuts_valides:
            return Response(
                {"statut": ["Statut de paiement invalide."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        paiement.statut = nouveau_statut
        paiement.reference = str(request.data.get("reference", "")).strip()[:120]
        paiement.paye_le = (
            timezone.now() if nouveau_statut == "paye" else None
        )
        paiement.save(update_fields=["statut", "reference", "paye_le"])
        journaliser(request, f"paiement.{nouveau_statut}", paiement)
        destinataires = [paiement.course.vendeur.utilisateur]
        if paiement.course.livreur_id:
            destinataires.append(paiement.course.livreur.utilisateur)
        for utilisateur in destinataires:
            notifier(
                utilisateur,
                "Paiement mis à jour",
                (
                    f"Le paiement « {paiement.get_type_display()} » de "
                    f"{paiement.course.reference} est maintenant "
                    f"« {paiement.get_statut_display()} »."
                ),
                "paiement",
                {
                    "course_id": str(paiement.course_id),
                    "paiement_id": str(paiement.id),
                    "statut": nouveau_statut,
                },
            )
        return Response(self.get_serializer(paiement).data)


class ZoneViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = ZoneSerializer
    queryset = Zone.objects.all()


class ParametresPlateformeView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(
            ParametresPlateformeSerializer(ParametresPlateforme.charger()).data
        )

    def patch(self, request):
        instance = ParametresPlateforme.charger()
        serializer = ParametresPlateformeSerializer(
            instance, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        journaliser(request, "parametres.modifies", instance)
        return Response(serializer.data)
