from pathlib import Path

from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from core.permissions import EstLivreur
from core.utils import journaliser

from .models import Document
from .serializers import (
    DisponibiliteSerializer,
    DocumentSerializer,
    LivreurSerializer,
    PositionLivreurSerializer,
)


class ProfilLivreurView(APIView):
    permission_classes = [EstLivreur]

    def get(self, request):
        return Response(
            LivreurSerializer(request.user.livreur, context={"request": request}).data
        )

    def patch(self, request):
        serializer = LivreurSerializer(
            request.user.livreur,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        journaliser(request, "livreur.profil_modifie", instance)
        return Response(serializer.data)


class DocumentUploadView(APIView):
    permission_classes = [EstLivreur]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "uploads"

    def get(self, request):
        documents = request.user.livreur.documents.all()
        return Response(DocumentSerializer(documents, many=True).data)

    @transaction.atomic
    def post(self, request):
        serializer = DocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        type_document = serializer.validated_data["type"]
        fichier = serializer.validated_data["fichier"]
        document, cree = Document.objects.update_or_create(
            livreur=request.user.livreur,
            type=type_document,
            defaults={
                "fichier": fichier,
                "statut": "en_attente",
                "commentaire_admin": "",
                "verifie_par": None,
                "verifie_le": None,
            },
        )
        if request.user.livreur.statut_verification == "refuse":
            request.user.livreur.statut_verification = "en_attente"
            request.user.livreur.save(update_fields=["statut_verification"])
        journaliser(request, "livreur.document_televerse", document)
        return Response(
            DocumentSerializer(document).data,
            status=status.HTTP_201_CREATED if cree else status.HTTP_200_OK,
        )


class DisponibiliteLivreurView(APIView):
    permission_classes = [EstLivreur]

    def patch(self, request):
        serializer = DisponibiliteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        livreur = request.user.livreur
        disponible = serializer.validated_data["disponible"]
        if disponible and livreur.statut_verification != "valide":
            raise serializers.ValidationError(
                {"disponible": "Votre compte doit être validé par Wona."}
            )
        if livreur.statut_disponibilite == "en_livraison" and not disponible:
            raise serializers.ValidationError(
                {"disponible": "Terminez d'abord votre livraison active."}
            )
        livreur.statut_disponibilite = (
            "disponible" if disponible else "hors_ligne"
        )
        livreur.save(update_fields=["statut_disponibilite"])
        journaliser(
            request,
            "livreur.disponibilite_modifiee",
            livreur,
            {"disponible": disponible},
        )
        return Response(LivreurSerializer(livreur).data)


class PositionLivreurView(APIView):
    permission_classes = [EstLivreur]

    def patch(self, request):
        serializer = PositionLivreurSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        livreur = request.user.livreur
        livreur.derniere_position_lat = serializer.validated_data["latitude"]
        livreur.derniere_position_lng = serializer.validated_data["longitude"]
        livreur.position_mise_a_jour_le = timezone.now()
        livreur.save(
            update_fields=[
                "derniere_position_lat",
                "derniere_position_lng",
                "position_mise_a_jour_le",
            ]
        )
        return Response(
            {
                "latitude": livreur.derniere_position_lat,
                "longitude": livreur.derniere_position_lng,
                "mise_a_jour_le": livreur.position_mise_a_jour_le,
            }
        )


class DocumentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        document = get_object_or_404(
            Document.objects.select_related("livreur__utilisateur"), pk=pk
        )
        est_proprietaire = (
            request.user.role == "livreur"
            and document.livreur.utilisateur_id == request.user.id
        )
        if not (request.user.is_staff or est_proprietaire):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Accès interdit à ce document.")
        fichier = document.fichier.open("rb")
        response = FileResponse(
            fichier,
            as_attachment=True,
            filename=Path(document.fichier.name).name,
            content_type="application/octet-stream",
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
