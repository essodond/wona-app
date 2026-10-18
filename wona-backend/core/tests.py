from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Utilisateur
from courses.models import Course, Paiement
from livreurs.models import Document


class AdministrationSecuriseeTests(APITestCase):
    def setUp(self):
        self.admin = Utilisateur.objects.create_superuser(
            telephone="90900000",
            password="MotDePasseAdmin-Tres-Solide-2026",
            role="admin",
        )
        self.livreur_user = Utilisateur.objects.create_user(
            telephone="90800000",
            role="livreur",
            nom_complet="Livreur Test",
            telephone_verifie=True,
        )
        self.vendeur_user = Utilisateur.objects.create_user(
            telephone="90700000",
            role="vendeur",
            nom_complet="Vendeur Test",
            telephone_verifie=True,
        )
        self.client.force_authenticate(self.admin)

    def test_livreur_ne_peut_pas_etre_valide_sans_tous_les_documents_valides(self):
        url = f"/api/administration/livreurs/{self.livreur_user.livreur.id}/valider/"
        incomplet = self.client.post(url, {}, format="json")
        self.assertEqual(incomplet.status_code, status.HTTP_400_BAD_REQUEST)

        for type_document in [
            "cni",
            "permis",
            "carte_grise",
            "photo_livreur",
            "photo_vehicule",
        ]:
            Document.objects.create(
                livreur=self.livreur_user.livreur,
                type=type_document,
                statut="valide",
                fichier=SimpleUploadedFile(
                    f"{type_document}.pdf",
                    b"%PDF-1.4 test",
                    content_type="application/pdf",
                ),
            )

        valide = self.client.post(url, {}, format="json")
        self.assertEqual(valide.status_code, status.HTTP_200_OK)
        self.livreur_user.livreur.refresh_from_db()
        self.assertEqual(
            self.livreur_user.livreur.statut_verification, "valide"
        )

    def test_rapprochement_paiement_est_journalise_via_api_admin(self):
        course = Course.objects.create(
            vendeur=self.vendeur_user.vendeur,
            destinataire_nom="Client",
            destinataire_telephone="+22890600000",
            adresse_depart="Tokoin",
            zone_depart="Tokoin",
            adresse_arrivee="Bè",
            zone_arrivee="Bè",
            description_colis="Test",
            prix_livraison=1500,
            statut="livree",
        )
        paiement = Paiement.objects.create(
            course=course,
            type="livraison",
            montant=1500,
            statut="non_paye",
        )
        response = self.client.post(
            f"/api/administration/paiements/{paiement.id}/mettre_a_jour/",
            {"statut": "paye", "reference": "TX-WONA-001"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        paiement.refresh_from_db()
        self.assertEqual(paiement.statut, "paye")
        self.assertEqual(paiement.reference, "TX-WONA-001")
        self.assertIsNotNone(paiement.paye_le)

    def test_document_livreur_est_protege_par_authentification_et_propriete(self):
        document = Document.objects.create(
            livreur=self.livreur_user.livreur,
            type="cni",
            fichier=SimpleUploadedFile(
                "identite.pdf",
                b"%PDF-1.4 confidentiel",
                content_type="application/pdf",
            ),
        )
        url = f"/api/livreurs/documents/{document.id}/telecharger/"

        self.client.force_authenticate(self.vendeur_user)
        interdit = self.client.get(url)
        self.assertEqual(interdit.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.livreur_user)
        proprietaire = self.client.get(url)
        self.assertEqual(proprietaire.status_code, status.HTTP_200_OK)
        self.assertEqual(proprietaire["Cache-Control"], "private, no-store")

        self.client.force_authenticate(self.admin)
        administrateur = self.client.get(url)
        self.assertEqual(administrateur.status_code, status.HTTP_200_OK)
