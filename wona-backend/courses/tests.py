from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Utilisateur

from .models import Course, HistoriqueStatut


class ReglesMetierCourseTests(APITestCase):
    def setUp(self):
        self.vendeur_user = Utilisateur.objects.create_user(
            telephone="90111111",
            role="vendeur",
            nom_complet="Boutique WoeLab",
            telephone_verifie=True,
        )
        self.livreur_user = Utilisateur.objects.create_user(
            telephone="90222222",
            role="livreur",
            nom_complet="Kossi",
            telephone_verifie=True,
        )
        self.autre_livreur_user = Utilisateur.objects.create_user(
            telephone="90333333",
            role="livreur",
            nom_complet="Ama",
            telephone_verifie=True,
        )
        for user in [self.livreur_user, self.autre_livreur_user]:
            user.livreur.statut_verification = "valide"
            user.livreur.statut_disponibilite = "disponible"
            user.livreur.save()
        self.course = Course.objects.create(
            vendeur=self.vendeur_user.vendeur,
            destinataire_nom="Adjo",
            destinataire_telephone="+22890444444",
            adresse_depart="Tokoin, rue 12",
            zone_depart="Tokoin",
            adresse_arrivee="Bè, avenue du marché",
            zone_arrivee="Bè",
            description_colis="Vêtements",
            prix_livraison=1200,
            montant_a_recuperer=8500,
            statut="en_attente",
        )
        self.course.definir_pin("4821")
        self.course.save(update_fields=["code_pin_hash", "code_pin_apercu"])

    def authentifier(self, user):
        self.client.force_authenticate(user=user)

    def test_donnees_destinataire_masquees_avant_acceptation(self):
        self.authentifier(self.livreur_user)
        response = self.client.get(f"/api/courses/{self.course.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["destinataire_telephone"])
        self.assertEqual(response.data["adresse_arrivee"], "Bè")
        self.assertTrue(response.data["informations_masquees"])

    def test_publication_accepte_un_lien_google_maps_long(self):
        self.authentifier(self.vendeur_user)
        lien_google_maps = (
            "https://www.google.com/maps/place/Lome/@6.1256,1.2254,17z/data="
            + "x" * 600
        )
        response = self.client.post(
            "/api/courses/",
            {
                "destinataire_nom": "Adjo",
                "destinataire_telephone": "90444444",
                "adresse_depart": "Tokoin, Lomé",
                "adresse_arrivee": lien_google_maps,
                "description_colis": "Un colis",
                "taille_colis": "petit",
                "prix_livraison": 1200,
                "montant_a_recuperer": 0,
                "methode_paiement": "especes",
                "urgence": "normale",
                "publier": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["adresse_arrivee"], lien_google_maps)

    def test_publication_refuse_une_adresse_demesuree(self):
        self.authentifier(self.vendeur_user)
        response = self.client.post(
            "/api/courses/",
            {
                "destinataire_nom": "Adjo",
                "destinataire_telephone": "90444444",
                "adresse_depart": "Tokoin, Lomé",
                "adresse_arrivee": "x" * 2049,
                "description_colis": "Un colis",
                "taille_colis": "petit",
                "prix_livraison": 1200,
                "montant_a_recuperer": 0,
                "methode_paiement": "especes",
                "urgence": "normale",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_une_course_ne_peut_etre_acceptee_quune_fois(self):
        self.authentifier(self.livreur_user)
        premiere = self.client.post(f"/api/courses/{self.course.id}/accepter/")
        self.assertEqual(premiere.status_code, status.HTTP_200_OK)
        self.assertEqual(premiere.data["code_pin_apercu"], "")
        self.assertNotIn("code_pin_livraison", premiere.data)

        self.authentifier(self.autre_livreur_user)
        seconde = self.client.post(f"/api/courses/{self.course.id}/accepter/")
        self.assertEqual(seconde.status_code, status.HTTP_400_BAD_REQUEST)
        self.course.refresh_from_db()
        self.assertEqual(self.course.livreur, self.livreur_user.livreur)

    def test_seul_le_vendeur_voit_lapercu_du_pin(self):
        self.authentifier(self.vendeur_user)
        vendeur_response = self.client.get(f"/api/courses/{self.course.id}/")
        self.assertEqual(vendeur_response.status_code, status.HTTP_200_OK)
        self.assertEqual(vendeur_response.data["code_pin_apercu"], "21")
        self.assertNotIn("code_pin_livraison", vendeur_response.data)

        self.course.livreur = self.livreur_user.livreur
        self.course.statut = "acceptee"
        self.course.save(update_fields=["livreur", "statut"])
        self.authentifier(self.livreur_user)
        livreur_response = self.client.get(f"/api/courses/{self.course.id}/")
        self.assertEqual(livreur_response.status_code, status.HTTP_200_OK)
        self.assertEqual(livreur_response.data["code_pin_apercu"], "")
        self.assertNotIn("code_pin_livraison", livreur_response.data)

    def test_etapes_et_pin_sont_imposes_par_le_serveur(self):
        self.authentifier(self.livreur_user)
        self.client.post(f"/api/courses/{self.course.id}/accepter/")
        for nouveau in ["en_route_retrait", "arrive_retrait"]:
            response = self.client.post(
                f"/api/courses/{self.course.id}/transition/",
                {"statut": nouveau},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        sans_confirmation = self.client.post(
            f"/api/courses/{self.course.id}/transition/",
            {"statut": "colis_recupere"},
            format="json",
        )
        self.assertEqual(sans_confirmation.status_code, status.HTTP_400_BAD_REQUEST)

        self.authentifier(self.vendeur_user)
        confirmation = self.client.post(
            f"/api/courses/{self.course.id}/confirmer_remise/"
        )
        self.assertEqual(confirmation.status_code, status.HTTP_200_OK)

        self.authentifier(self.livreur_user)
        for nouveau in ["colis_recupere", "en_livraison"]:
            response = self.client.post(
                f"/api/courses/{self.course.id}/transition/",
                {"statut": nouveau},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        mauvais_pin = self.client.post(
            f"/api/courses/{self.course.id}/confirmer_livraison/",
            {"pin": "0000"},
            format="json",
        )
        self.assertEqual(mauvais_pin.status_code, status.HTTP_400_BAD_REQUEST)

        bon_pin = self.client.post(
            f"/api/courses/{self.course.id}/confirmer_livraison/",
            {"pin": "4821"},
            format="json",
        )
        self.assertEqual(bon_pin.status_code, status.HTTP_200_OK)
        self.course.refresh_from_db()
        self.assertEqual(self.course.statut, "livree")
        self.assertGreaterEqual(
            HistoriqueStatut.objects.filter(course=self.course).count(), 6
        )

    def test_annulation_simple_interdite_apres_recuperation(self):
        self.course.livreur = self.livreur_user.livreur
        self.course.statut = "colis_recupere"
        self.course.save()
        self.authentifier(self.vendeur_user)
        response = self.client.post(
            f"/api/courses/{self.course.id}/annuler/",
            {"motif": "Le client ne répond plus."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AutorisationsAdminTests(APITestCase):
    def test_tableau_de_bord_refuse_un_vendeur(self):
        vendeur = Utilisateur.objects.create_user(
            telephone="90999999", role="vendeur", telephone_verifie=True
        )
        self.client.force_authenticate(vendeur)
        response = self.client.get("/api/administration/tableau-de-bord/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
