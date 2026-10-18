from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from core.places import PlaceAutocompleteView, PlaceDetailsView
from core.views import HealthView


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthView.as_view(), name="health"),
    path(
        "api/localisation/autocomplete/",
        PlaceAutocompleteView.as_view(),
        name="place-autocomplete",
    ),
    path(
        "api/localisation/details/",
        PlaceDetailsView.as_view(),
        name="place-details",
    ),
    path("api/auth/", include("accounts.urls")),
    path("api/vendeurs/", include("vendeurs.urls")),
    path("api/livreurs/", include("livreurs.urls")),
    path("api/courses/", include("courses.urls")),
    path("api/administration/", include("core.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
