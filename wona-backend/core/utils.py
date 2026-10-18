from django.db import transaction

from .models import JournalAudit, Notification
from .push import envoyer_notification_push


def adresse_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def journaliser(request, action, cible=None, details=None):
    return JournalAudit.objects.create(
        utilisateur=request.user if request.user.is_authenticated else None,
        action=action,
        cible_type=cible.__class__.__name__ if cible else "",
        cible_id=str(getattr(cible, "pk", "")) if cible else "",
        details=details or {},
        adresse_ip=adresse_ip(request),
    )


def notifier(utilisateur, titre, message, type_notification="systeme", donnees=None):
    notification = Notification.objects.create(
        utilisateur=utilisateur,
        titre=titre,
        message=message,
        type=type_notification,
        donnees=donnees or {},
    )
    transaction.on_commit(lambda: envoyer_notification_push(notification))
    return notification
