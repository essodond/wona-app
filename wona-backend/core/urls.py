from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminCourseViewSet,
    AdminDocumentViewSet,
    AdminLivreurViewSet,
    AdminPaiementViewSet,
    AdminSignalementViewSet,
    AdminUtilisateurViewSet,
    ParametresPlateformeView,
    TableauDeBordAdminView,
    ZoneViewSet,
)


router = DefaultRouter()
router.register("utilisateurs", AdminUtilisateurViewSet, basename="admin-utilisateurs")
router.register("livreurs", AdminLivreurViewSet, basename="admin-livreurs")
router.register("documents", AdminDocumentViewSet, basename="admin-documents")
router.register("courses", AdminCourseViewSet, basename="admin-courses")
router.register("signalements", AdminSignalementViewSet, basename="admin-signalements")
router.register("paiements", AdminPaiementViewSet, basename="admin-paiements")
router.register("zones", ZoneViewSet, basename="admin-zones")

urlpatterns = [
    path("tableau-de-bord/", TableauDeBordAdminView.as_view()),
    path("parametres/", ParametresPlateformeView.as_view()),
    path("", include(router.urls)),
]
