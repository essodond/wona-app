import re

from django.core.exceptions import ValidationError


def normaliser_telephone(valeur):
    chiffres = re.sub(r"\D", "", str(valeur or ""))
    if chiffres.startswith("00228"):
        chiffres = chiffres[5:]
    elif chiffres.startswith("228"):
        chiffres = chiffres[3:]
    if len(chiffres) != 8:
        raise ValidationError(
            "Saisissez un numéro togolais valide à 8 chiffres.",
            code="telephone_invalide",
        )
    return f"+228{chiffres}"
