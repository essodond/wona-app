from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import EstVendeur
from core.utils import journaliser

from .models import AdresseRetrait
from .serializers import AdresseRetraitSerializer, VendeurSerializer


class ProfilVendeurView(APIView):
    permission_classes = [EstVendeur]

    def get(self, request):
        return Response(
            VendeurSerializer(request.user.vendeur, context={"request": request}).data
        )

    def patch(self, request):
        serializer = VendeurSerializer(
            request.user.vendeur,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        journaliser(request, "vendeur.profil_modifie", instance)
        return Response(serializer.data)


class AdresseRetraitViewSet(viewsets.ModelViewSet):
    permission_classes = [EstVendeur]
    serializer_class = AdresseRetraitSerializer

    def get_queryset(self):
        return AdresseRetrait.objects.filter(vendeur=self.request.user.vendeur)

    def perform_create(self, serializer):
        instance = serializer.save(vendeur=self.request.user.vendeur)
        journaliser(self.request, "vendeur.adresse_ajoutee", instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        journaliser(self.request, "vendeur.adresse_modifiee", instance)

    def perform_destroy(self, instance):
        instance.active = False
        instance.save(update_fields=["active"])
        journaliser(self.request, "vendeur.adresse_desactivee", instance)
