from django.urls import path, re_path, include

from .views import index, sentry

urlpatterns = [
    path("", index, name="index"),
    path("auth/", include("accounts.urls")),
    path("df/", include("dynamic_forms.urls")),
    path("docxbuilder/", include("docxbuilder.urls")),
    path("webhooks/", include("webhooks.urls")),
    path("sentry/", sentry),
    # Prevents error if user navigates directly to nested url (i.e. /login)
    re_path(r"^(?P<path>.*)$", index),
]
