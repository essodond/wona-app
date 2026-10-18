from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Utilisateur


@override_settings(OTP_DEBUG_RETURN_CODE=True)
class AuthentificationOTPTests(APITestCase):
    @override_settings(
        OTP_DEBUG_RETURN_CODE=False,
        OTP_TEST_CODE="482731",
        SMS_PROVIDER_URL="",
    )
    def test_code_partage_de_campagne_n_est_pas_expose_par_api(self):
        demande = self.client.post(
            "/api/auth/otp/demande/",
            {"telephone": "90 44 55 66", "role": "vendeur"},
            format="json",
        )
        self.assertEqual(demande.status_code, status.HTTP_202_ACCEPTED)
        self.assertNotIn("code_developpement", demande.data)

        verification = self.client.post(
            "/api/auth/otp/verification/",
            {
                "telephone": "90445566",
                "role": "vendeur",
                "code": "482731",
            },
            format="json",
        )
        self.assertEqual(verification.status_code, status.HTTP_200_OK)

    def test_creation_compte_et_reutilisation_du_code_interdite(self):
        demande = self.client.post(
            "/api/auth/otp/demande/",
            {"telephone": "90 12 34 56", "role": "vendeur"},
            format="json",
        )
        self.assertEqual(demande.status_code, status.HTTP_202_ACCEPTED)
        code = demande.data["code_developpement"]

        verification = self.client.post(
            "/api/auth/otp/verification/",
            {
                "telephone": "90123456",
                "role": "vendeur",
                "code": code,
                "nom": "Boutique Kékéli",
            },
            format="json",
        )
        self.assertEqual(verification.status_code, status.HTTP_200_OK)
        self.assertIn("access", verification.data)
        self.assertTrue(
            Utilisateur.objects.get(telephone="+22890123456").telephone_verifie
        )

        reutilisation = self.client.post(
            "/api/auth/otp/verification/",
            {
                "telephone": "90123456",
                "role": "vendeur",
                "code": code,
            },
            format="json",
        )
        self.assertEqual(reutilisation.status_code, status.HTTP_400_BAD_REQUEST)

    def test_un_numero_ne_peut_pas_changer_de_role(self):
        Utilisateur.objects.create_user(
            telephone="90112233",
            role="vendeur",
            telephone_verifie=True,
        )
        response = self.client.post(
            "/api/auth/otp/demande/",
            {"telephone": "90112233", "role": "livreur"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("code_developpement", response.data)
