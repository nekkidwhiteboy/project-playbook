from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("", views.Webhooks, basename="webhooks")

urlpatterns = []
urlpatterns += router.urls
