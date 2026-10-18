from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Utilisateur


@receiver(post_save, sender=Utilisateur)
def creer_profil_associe(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.role == "vendeur":
        from vendeurs.models import Vendeur

        Vendeur.objects.get_or_create(
            utilisateur=instance,
            defaults={"nom": instance.nom_complet},
        )
    elif instance.role == "livreur":
        from livreurs.models import Livreur

        Livreur.objects.get_or_create(
            utilisateur=instance,
            defaults={"nom": instance.nom_complet},
        )
