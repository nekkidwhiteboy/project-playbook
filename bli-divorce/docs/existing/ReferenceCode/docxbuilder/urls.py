from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("templates", views.TemplateViewSet, basename="templates")
router.register("sets", views.TemplateSetViewSet, basename="sets")

urlpatterns = router.urls
