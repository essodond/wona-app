from rest_framework.permissions import BasePermission


class EstVendeur(BasePermission):
    message = "Cette action est réservée aux vendeurs."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == "vendeur"
            and hasattr(request.user, "vendeur")
        )


class EstLivreur(BasePermission):
    message = "Cette action est réservée aux livreurs."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == "livreur"
            and hasattr(request.user, "livreur")
        )


class EstLivreurValide(EstLivreur):
    message = "Votre compte livreur doit être validé et disponible."

    def has_permission(self, request, view):
        return super().has_permission(request, view) and (
            request.user.livreur.statut_verification == "valide"
        )
