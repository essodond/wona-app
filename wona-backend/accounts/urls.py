from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    AppareilNotificationView,
    ConnexionAdminView,
    DeconnexionView,
    DemandeOTPView,
    NotificationsView,
    ProfilUtilisateurView,
    VerificationOTPView,
)


urlpatterns = [
    path("otp/demande/", DemandeOTPView.as_view(), name="otp-demande"),
    path("otp/verification/", VerificationOTPView.as_view(), name="otp-verification"),
    path("admin/connexion/", ConnexionAdminView.as_view(), name="admin-connexion"),
    path("token/rafraichir/", TokenRefreshView.as_view(), name="token-refresh"),
    path("token/verifier/", TokenVerifyView.as_view(), name="token-verify"),
    path("deconnexion/", DeconnexionView.as_view(), name="deconnexion"),
    path("moi/", ProfilUtilisateurView.as_view(), name="profil-utilisateur"),
    path(
        "appareil-notification/",
        AppareilNotificationView.as_view(),
        name="appareil-notification",
    ),
    path("notifications/", NotificationsView.as_view(), name="notifications"),
]
