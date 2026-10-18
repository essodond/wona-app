import json
import logging
from urllib import error, request

from django.conf import settings


logger = logging.getLogger(__name__)


def envoyer_notification_push(notification):
    if not settings.EXPO_PUSH_ENABLED:
        return
    appareils = list(
        notification.utilisateur.appareils_notification.filter(actif=True)
    )
    if not appareils:
        return
    messages = [
        {
            "to": appareil.jeton,
            "title": notification.titre,
            "body": notification.message,
            "data": notification.donnees,
            "sound": "default",
            "channelId": "wona",
        }
        for appareil in appareils
    ]
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip, deflate",
    }
    if settings.EXPO_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {settings.EXPO_ACCESS_TOKEN}"
    req = request.Request(
        settings.EXPO_PUSH_URL,
        data=json.dumps(messages).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=8) as response:
            if not 200 <= response.status < 300:
                logger.warning(
                    "Expo Push a répondu avec le statut %s.", response.status
                )
    except (error.HTTPError, error.URLError, TimeoutError):
        logger.exception(
            "Échec d'envoi push pour la notification %s.", notification.pk
        )

