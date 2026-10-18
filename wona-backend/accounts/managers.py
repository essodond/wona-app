from django.contrib.auth.models import BaseUserManager

from .validators import normaliser_telephone


class UtilisateurManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, telephone, password=None, **extra_fields):
        if not telephone:
            raise ValueError("Le téléphone est obligatoire.")
        telephone = normaliser_telephone(telephone)
        user = self.model(telephone=telephone, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, telephone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("telephone_verifie", True)
        extra_fields.setdefault("role", "admin")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superutilisateur doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superutilisateur doit avoir is_superuser=True.")
        if not password:
            raise ValueError("Un mot de passe administrateur est obligatoire.")

        return self.create_user(telephone, password, **extra_fields)
