import json
import re
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
DETAILS_URL = "https://places.googleapis.com/v1/places"
SESSION_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{8,128}$")
PLACE_ID_RE = re.compile(r"^[A-Za-z0-9_.:-]{3,512}$")
TOGO_BOUNDS = {
    "min_latitude": 5.5,
    "max_latitude": 11.5,
    "min_longitude": -0.5,
    "max_longitude": 2.0,
}


class GooglePlacesError(Exception):
    pass


def _google_json(request):
    try:
        with urlopen(request, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        try:
            payload = json.loads(exc.read().decode("utf-8"))
            message = payload.get("error", {}).get("message")
        except (json.JSONDecodeError, UnicodeDecodeError):
            message = None
        raise GooglePlacesError(
            message or "Google Places a refuse la requete."
        ) from exc
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise GooglePlacesError(
            "Google Places est momentanement indisponible."
        ) from exc


def _valid_session_token(value):
    return value if SESSION_TOKEN_RE.fullmatch(value or "") else ""


def _in_togo(latitude, longitude):
    return (
        TOGO_BOUNDS["min_latitude"] <= latitude <= TOGO_BOUNDS["max_latitude"]
        and TOGO_BOUNDS["min_longitude"]
        <= longitude
        <= TOGO_BOUNDS["max_longitude"]
    )


class PlaceAutocompleteView(APIView):
    throttle_scope = "places"

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        session_token = _valid_session_token(
            request.query_params.get("session_token", "")
        )
        if len(query) < 3:
            return Response(
                {
                    "suggestions": [],
                    "configured": bool(settings.GOOGLE_MAPS_API_KEY),
                }
            )
        if len(query) > 150:
            return Response(
                {"detail": "La recherche est trop longue."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not session_token:
            return Response(
                {"detail": "Session de recherche invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not settings.GOOGLE_MAPS_API_KEY:
            return Response({"suggestions": [], "configured": False})

        body = {
            "input": query,
            "includedRegionCodes": ["tg"],
            "languageCode": "fr",
            "regionCode": "tg",
            "locationBias": {
                "circle": {
                    "center": {"latitude": 6.1319, "longitude": 1.2228},
                    "radius": 50000.0,
                }
            },
            "sessionToken": session_token,
        }
        google_request = Request(
            AUTOCOMPLETE_URL,
            data=json.dumps(body).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
                "X-Goog-FieldMask": (
                    "suggestions.placePrediction.placeId,"
                    "suggestions.placePrediction.text.text,"
                    "suggestions.placePrediction.structuredFormat.mainText.text,"
                    "suggestions.placePrediction.structuredFormat.secondaryText.text"
                ),
            },
        )
        try:
            payload = _google_json(google_request)
        except GooglePlacesError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY
            )

        suggestions = []
        for item in payload.get("suggestions", []):
            prediction = item.get("placePrediction") or {}
            place_id = prediction.get("placeId")
            text = (prediction.get("text") or {}).get("text", "")
            structured = prediction.get("structuredFormat") or {}
            if not place_id or not text:
                continue
            suggestions.append(
                {
                    "place_id": place_id,
                    "description": text,
                    "main_text": (structured.get("mainText") or {}).get(
                        "text", text
                    ),
                    "secondary_text": (structured.get("secondaryText") or {}).get(
                        "text", ""
                    ),
                    "provider": "google",
                }
            )

        return Response({"suggestions": suggestions[:5], "configured": True})


class PlaceDetailsView(APIView):
    throttle_scope = "places"

    def get(self, request):
        place_id = request.query_params.get("place_id", "").strip()
        session_token = _valid_session_token(
            request.query_params.get("session_token", "")
        )
        if not PLACE_ID_RE.fullmatch(place_id):
            return Response(
                {"detail": "Lieu invalide."}, status=status.HTTP_400_BAD_REQUEST
            )
        if not session_token:
            return Response(
                {"detail": "Session de recherche invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not settings.GOOGLE_MAPS_API_KEY:
            return Response(
                {"detail": "La recherche Google Places n'est pas configuree."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        query = urlencode(
            {
                "languageCode": "fr",
                "regionCode": "tg",
                "sessionToken": session_token,
            }
        )
        google_request = Request(
            f"{DETAILS_URL}/{quote(place_id, safe='')}?{query}",
            headers={
                "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
                "X-Goog-FieldMask": "id,formattedAddress,location",
            },
        )
        try:
            payload = _google_json(google_request)
        except GooglePlacesError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY
            )

        location = payload.get("location") or {}
        try:
            latitude = float(location["latitude"])
            longitude = float(location["longitude"])
        except (KeyError, TypeError, ValueError):
            return Response(
                {"detail": "Google n'a pas fourni de position exploitable."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if not _in_togo(latitude, longitude):
            return Response(
                {"detail": "Ce lieu est hors du Togo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        formatted_address = payload.get("formattedAddress", "").strip()
        maps_query = urlencode(
            {
                "api": "1",
                "query": f"{latitude:.6f},{longitude:.6f}",
                "query_place_id": place_id,
            }
        )
        return Response(
            {
                "place_id": payload.get("id", place_id),
                "formatted_address": formatted_address,
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6),
                "google_maps_url": f"https://www.google.com/maps/search/?{maps_query}",
            }
        )
