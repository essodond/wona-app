import json
import logging
from urllib import error, request

from django.conf import settings


logger = logging.getLogger(__name__)


def envoyer_sms(telephone, message):
    """Envoie un SMS via la passerelle HTTP configurée.

    La passerelle reçoit un JSON standard ``to``, ``message`` et ``sender``.
    Aucun code OTP n'est écrit dans les journaux hors développement.
    """

    if settings.OTP_TEST_CODE and not settings.SMS_PROVIDER_URL:
        logger.info("Mode OTP de test utilise pour %s.", telephone)
        return True
    if settings.OTP_DEBUG_RETURN_CODE and not settings.SMS_PROVIDER_URL:
        logger.info("SMS de développement envoyé à %s: %s", telephone, message)
        return True
    if not settings.SMS_PROVIDER_URL:
        logger.error("Passerelle SMS absente pour %s.", telephone)
        return False

    payload = json.dumps(
        {
            "to": telephone,
            "message": message,
            "sender": settings.SMS_SENDER,
        }
    ).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if settings.SMS_PROVIDER_TOKEN:
        headers["Authorization"] = f"Bearer {settings.SMS_PROVIDER_TOKEN}"
    req = request.Request(
        settings.SMS_PROVIDER_URL,
        data=payload,
        headers=headers,
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=settings.SMS_TIMEOUT_SECONDS) as response:
            return 200 <= response.status < 300
    except (error.HTTPError, error.URLError, TimeoutError):
        logger.exception("Échec d'envoi SMS vers %s.", telephone)
        return False
