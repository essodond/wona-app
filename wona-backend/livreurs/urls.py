from django.urls import path

from .views import (
    DisponibiliteLivreurView,
    DocumentDownloadView,
    DocumentUploadView,
    PositionLivreurView,
    ProfilLivreurView,
)


urlpatterns = [
    path("profil/", ProfilLivreurView.as_view(), name="profil-livreur"),
    path("documents/", DocumentUploadView.as_view(), name="documents-livreur"),
    path(
        "documents/<uuid:pk>/telecharger/",
        DocumentDownloadView.as_view(),
        name="document-livreur-telecharger",
    ),
    path(
        "disponibilite/",
        DisponibiliteLivreurView.as_view(),
        name="disponibilite-livreur",
    ),
    path("position/", PositionLivreurView.as_view(), name="position-livreur"),
]
