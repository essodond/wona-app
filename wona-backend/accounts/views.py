import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Notification
from core.utils import adresse_ip, journaliser
from core.sms import envoyer_sms

from .models import AppareilNotification, CodeOTP, Utilisateur
from .serializers import (
    AppareilNotificationSerializer,
    ConnexionAdminSerializer,
    DemandeOTPSerializer,
    UtilisateurSerializer,
    VerificationOTPSerializer,
)


def creer_jetons(utilisateur):
    refresh = RefreshToken.for_user(utilisateur)
    refresh["role"] = utilisateur.role
    refresh["telephone_verifie"] = utilisateur.telephone_verifie
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class DemandeOTPView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    def post(self, request):
        serializer = DemandeOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        telephone = serializer.validated_data["telephone"]
        role = serializer.validated_data["role"]

        utilisateur = Utilisateur.objects.filter(telephone=telephone).first()
        if utilisateur and utilisateur.role != role:
            # Réponse volontairement générique pour ne pas révéler les comptes.
            return Response(
                {"message": "Si ce numéro peut être utilisé, un code a été envoyé."}
            )

        # Une campagne de test peut utiliser un code partage, defini uniquement
        # dans l'environnement du serveur. Il n'est jamais renvoye par l'API.
        code_clair = settings.OTP_TEST_CODE or f"{secrets.randbelow(1_000_000):06d}"
        CodeOTP.objects.filter(
            telephone=telephone, role=role, utilise=False
        ).update(utilise=True, utilise_le=timezone.now())
        CodeOTP.objects.create(
            telephone=telephone,
            role=role,
            code=make_password(code_clair),
            expire_le=timezone.now()
            + timedelta(seconds=settings.OTP_TTL_SECONDS),
            adresse_ip=adresse_ip(request),
        )
        envoyer_sms(
            telephone,
            f"Votre code Wona est {code_clair}. Il expire dans 5 minutes.",
        )

        payload = {
            "message": "Si ce numéro peut être utilisé, un code a été envoyé.",
            "expire_dans": settings.OTP_TTL_SECONDS,
        }
        if settings.OTP_DEBUG_RETURN_CODE:
            payload["code_developpement"] = code_clair
        return Response(payload, status=status.HTTP_202_ACCEPTED)


class VerificationOTPView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp_verify"

    @transaction.atomic
    def post(self, request):
        serializer = VerificationOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        telephone = serializer.validated_data["telephone"]
        role = serializer.validated_data["role"]
        code_clair = serializer.validated_data["code"]
        nom = serializer.validated_data.get("nom", "").strip()

        otp = (
            CodeOTP.objects.select_for_update()
            .filter(telephone=telephone, role=role, utilise=False)
            .order_by("-date_creation")
            .first()
        )
        if not otp or not otp.est_valide:
            raise serializers.ValidationError(
                {"code": "Code invalide ou expiré. Demandez un nouveau code."}
            )
        if not check_password(code_clair, otp.code):
            otp.tentatives += 1
            if otp.tentatives >= 5:
                otp.utilise = True
                otp.utilise_le = timezone.now()
            otp.save(update_fields=["tentatives", "utilise", "utilise_le"])
            raise serializers.ValidationError({"code": "Code invalide."})

        otp.utilise = True
        otp.utilise_le = timezone.now()
        otp.save(update_fields=["utilise", "utilise_le"])

        utilisateur = (
            Utilisateur.objects.select_for_update()
            .filter(telephone=telephone)
            .first()
        )
        nouveau_compte = utilisateur is None
        if utilisateur and utilisateur.role != role:
            raise serializers.ValidationError(
                {"role": "Ce numéro est déjà associé à un autre profil."}
            )
        if utilisateur is None:
            utilisateur = Utilisateur.objects.create_user(
                telephone=telephone,
                role=role,
                nom_complet=nom,
                telephone_verifie=True,
            )
        else:
            utilisateur.telephone_verifie = True
            if nom:
                utilisateur.nom_complet = nom
            utilisateur.save(update_fields=["telephone_verifie", "nom_complet"])

        if role == "vendeur" and hasattr(utilisateur, "vendeur") and nom:
            utilisateur.vendeur.nom = nom
            utilisateur.vendeur.save(update_fields=["nom"])
        if role == "livreur" and hasattr(utilisateur, "livreur") and nom:
            utilisateur.livreur.nom = nom
            utilisateur.livreur.save(update_fields=["nom"])

        tokens = creer_jetons(utilisateur)
        return Response(
            {
                **tokens,
                "nouveau_compte": nouveau_compte,
                "utilisateur": UtilisateurSerializer(
                    utilisateur, context={"request": request}
                ).data,
            }
        )


class ProfilUtilisateurView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            UtilisateurSerializer(request.user, context={"request": request}).data
        )

    def patch(self, request):
        serializer = UtilisateurSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        journaliser(request, "profil.modifie", request.user)
        return Response(serializer.data)


class DeconnexionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_value = request.data.get("refresh")
        if not refresh_value:
            raise serializers.ValidationError(
                {"refresh": "Le jeton de rafraîchissement est obligatoire."}
            )
        try:
            RefreshToken(refresh_value).blacklist()
        except Exception as exc:
            raise serializers.ValidationError({"refresh": "Jeton invalide."}) from exc
        journaliser(request, "auth.deconnexion")
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConnexionAdminView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "admin_login"

    def post(self, request):
        serializer = ConnexionAdminSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        utilisateur = serializer.validated_data["utilisateur"]
        return Response(
            {
                **creer_jetons(utilisateur),
                "utilisateur": UtilisateurSerializer(utilisateur).data,
            }
        )


class AppareilNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AppareilNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appareil, _ = AppareilNotification.objects.update_or_create(
            jeton=serializer.validated_data["jeton"],
            defaults={
                "utilisateur": request.user,
                "plateforme": serializer.validated_data["plateforme"],
                "actif": True,
            },
        )
        return Response(
            AppareilNotificationSerializer(appareil).data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request):
        jeton = request.data.get("jeton")
        AppareilNotification.objects.filter(
            utilisateur=request.user, jeton=jeton
        ).update(actif=False)
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = request.user.notifications.all()[:100]
        return Response(
            [
                {
                    "id": item.id,
                    "type": item.type,
                    "titre": item.titre,
                    "message": item.message,
                    "donnees": item.donnees,
                    "lu_le": item.lu_le,
                    "cree_le": item.cree_le,
                }
                for item in notifications
            ]
        )

    def patch(self, request):
        ids = request.data.get("ids", [])
        queryset = Notification.objects.filter(utilisateur=request.user)
        if ids:
            queryset = queryset.filter(id__in=ids)
        queryset.filter(lu_le__isnull=True).update(lu_le=timezone.now())
        return Response(status=status.HTTP_204_NO_CONTENT)
