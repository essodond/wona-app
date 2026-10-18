import json
from unittest.mock import MagicMock, patch

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Utilisateur


class GooglePlacesTests(APITestCase):
    def setUp(self):
        self.user = Utilisateur.objects.create_user(
            telephone="90112233",
            role="vendeur",
            telephone_verifie=True,
        )
        self.client.force_authenticate(self.user)
        self.session_token = "session_token_123456"

    @override_settings(GOOGLE_MAPS_API_KEY="")
    def test_autocomplete_indique_quand_google_n_est_pas_configure(self):
        response = self.client.get(
            "/api/localisation/autocomplete/",
            {"q": "Solime Tran", "session_token": self.session_token},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["configured"])
        self.assertEqual(response.data["suggestions"], [])

    @override_settings(GOOGLE_MAPS_API_KEY="test-server-key")
    @patch("core.places.urlopen")
    def test_autocomplete_est_limite_au_togo(self, mocked_urlopen):
        google_response = MagicMock()
        google_response.read.return_value = json.dumps(
            {
                "suggestions": [
                    {
                        "placePrediction": {
                            "placeId": "ChIJ-solime-lome",
                            "text": {"text": "Solime Transit, Lome, Togo"},
                            "structuredFormat": {
                                "mainText": {"text": "Solime Transit"},
                                "secondaryText": {"text": "Lome, Togo"},
                            },
                        }
                    }
                ]
            }
        ).encode("utf-8")
        mocked_urlopen.return_value.__enter__.return_value = google_response

        response = self.client.get(
            "/api/localisation/autocomplete/",
            {"q": "Solime Tran", "session_token": self.session_token},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["suggestions"][0]["main_text"], "Solime Transit")
        sent_body = json.loads(mocked_urlopen.call_args.args[0].data.decode("utf-8"))
        self.assertEqual(sent_body["includedRegionCodes"], ["tg"])
        self.assertEqual(sent_body["regionCode"], "tg")

    @override_settings(GOOGLE_MAPS_API_KEY="test-server-key")
    @patch("core.places.urlopen")
    def test_details_retourne_les_coordonnees_et_le_lien(self, mocked_urlopen):
        google_response = MagicMock()
        google_response.read.return_value = json.dumps(
            {
                "id": "ChIJ-solime-lome",
                "formattedAddress": "Solime Transit, Lome, Togo",
                "location": {"latitude": 6.145678, "longitude": 1.234567},
            }
        ).encode("utf-8")
        mocked_urlopen.return_value.__enter__.return_value = google_response

        response = self.client.get(
            "/api/localisation/details/",
            {
                "place_id": "ChIJ-solime-lome",
                "session_token": self.session_token,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["latitude"], 6.145678)
        self.assertEqual(response.data["longitude"], 1.234567)
        self.assertIn("query_place_id=ChIJ-solime-lome", response.data["google_maps_url"])

    @override_settings(GOOGLE_MAPS_API_KEY="test-server-key")
    @patch("core.places.urlopen")
    def test_details_refuse_une_position_hors_du_togo(self, mocked_urlopen):
        google_response = MagicMock()
        google_response.read.return_value = json.dumps(
            {
                "id": "ChIJ-niger",
                "formattedAddress": "Niamey, Niger",
                "location": {"latitude": 13.5116, "longitude": 2.1254},
            }
        ).encode("utf-8")
        mocked_urlopen.return_value.__enter__.return_value = google_response

        response = self.client.get(
            "/api/localisation/details/",
            {"place_id": "ChIJ-niger", "session_token": self.session_token},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Ce lieu est hors du Togo.")
