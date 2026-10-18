"""Configuration Django de l'API Wona.

Les valeurs de développement permettent de lancer les tests sans service
externe. En production, les secrets, hôtes et origines doivent être fournis par
l'environnement.
"""

import re
from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import Csv, config
from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = config("DEBUG", default=True, cast=bool)
_development_secret = "dev-only-change-me-before-production"
SECRET_KEY = config("SECRET_KEY", default=_development_secret)
if not DEBUG and SECRET_KEY == _development_secret:
    raise ImproperlyConfigured("SECRET_KEY doit être définie en production.")

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="localhost,127.0.0.1",
    cast=Csv(),
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "core",
    "accounts",
    "vendeurs",
    "livreurs",
    "courses",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASE_URL = config("DATABASE_URL", default="")
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=config("DB_CONN_MAX_AGE", default=60, cast=int),
            conn_health_checks=True,
        )
    }
elif config("DB_NAME", default=""):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("DB_NAME"),
            "USER": config("DB_USER"),
            "PASSWORD": config("DB_PASSWORD"),
            "HOST": config("DB_HOST", default="127.0.0.1"),
            "PORT": config("DB_PORT", default="5432"),
            "CONN_MAX_AGE": config("DB_CONN_MAX_AGE", default=60, cast=int),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_USER_MODEL = "accounts.Utilisateur"
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/hour",
        "user": "1200/hour",
        "otp": "5/minute",
        "otp_verify": "10/minute",
        "admin_login": "5/minute",
        "uploads": "20/hour",
        "delivery_pin": "5/minute",
        "places": "600/hour",
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "EXCEPTION_HANDLER": "core.exceptions.api_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "CHECK_USER_IS_ACTIVE": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ISSUER": "wona-api",
}

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Lome"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

DATA_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024

CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://localhost:5173",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = False
CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="",
    cast=Csv(),
)

OTP_TTL_SECONDS = config("OTP_TTL_SECONDS", default=300, cast=int)
OTP_DEBUG_RETURN_CODE = config("OTP_DEBUG_RETURN_CODE", default=DEBUG, cast=bool)
OTP_TEST_CODE = config("OTP_TEST_CODE", default="").strip()
if OTP_TEST_CODE and not re.fullmatch(r"\d{6}", OTP_TEST_CODE):
    raise ImproperlyConfigured("OTP_TEST_CODE doit contenir exactement 6 chiffres.")
if not DEBUG and OTP_DEBUG_RETURN_CODE:
    raise ImproperlyConfigured(
        "OTP_DEBUG_RETURN_CODE doit être désactivé en production."
    )

SMS_PROVIDER_URL = config("SMS_PROVIDER_URL", default="")
SMS_PROVIDER_TOKEN = config("SMS_PROVIDER_TOKEN", default="")
SMS_SENDER = config("SMS_SENDER", default="WONA")
SMS_TIMEOUT_SECONDS = config("SMS_TIMEOUT_SECONDS", default=8, cast=int)
if not DEBUG and not SMS_PROVIDER_URL and not OTP_TEST_CODE:
    raise ImproperlyConfigured(
        "SMS_PROVIDER_URL doit être définie en production pour l'authentification OTP."
    )

EXPO_PUSH_ENABLED = config("EXPO_PUSH_ENABLED", default=False, cast=bool)
EXPO_PUSH_URL = config(
    "EXPO_PUSH_URL",
    default="https://exp.host/--/api/v2/push/send",
)
EXPO_ACCESS_TOKEN = config("EXPO_ACCESS_TOKEN", default="")

# La cle reste exclusivement sur l'API Django. Elle ne doit jamais etre
# exposee dans EXPO_PUBLIC_* ni integree au bundle de l'application mobile.
GOOGLE_MAPS_API_KEY = config("GOOGLE_MAPS_API_KEY", default="")

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "same-origin"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=31536000, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "jsonish": {
            "format": "{asctime} {levelname} {name} {message}",
            "style": "{",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "jsonish",
        }
    },
    "root": {"handlers": ["console"], "level": "INFO"},
}
