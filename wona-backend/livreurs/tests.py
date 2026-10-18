from decimal import Decimal

from django.test import SimpleTestCase

from .serializers import PositionLivreurSerializer


class PositionLivreurSerializerTests(SimpleTestCase):
    def test_normalise_la_precision_brute_du_gps(self):
        serializer = PositionLivreurSerializer(
            data={
                "latitude": 6.1256789123,
                "longitude": 1.2256789123,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["latitude"],
            Decimal("6.125679"),
        )
        self.assertEqual(
            serializer.validated_data["longitude"],
            Decimal("1.225679"),
        )

    def test_refuse_une_coordonnee_non_finie(self):
        serializer = PositionLivreurSerializer(
            data={
                "latitude": float("nan"),
                "longitude": 1.225678,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("latitude", serializer.errors)
