from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdresseRetraitViewSet, ProfilVendeurView


router = DefaultRouter()
router.register("adresses", AdresseRetraitViewSet, basename="adresses-retrait")

urlpatterns = [
    path("profil/", ProfilVendeurView.as_view(), name="profil-vendeur"),
    path("", include(router.urls)),
]
