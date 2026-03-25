from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(
    "submit_actions/email", views.EmailActionViewSet, basename="email_actions"
),
router.register(
    "submit_actions/new_result",
    views.NewResultSubmitActionViewSet,
    basename="new_result_actions",
)
router.register("results", views.ResultViewSet, basename="results")

urlpatterns = [
    path("forms/", views.DynamicFormListView.as_view()),
    path("forms/<int:pk>/", views.DynamicFormView.as_view()),
    path("forms/<slug:slug>/", views.DynamicFormView.as_view()),
    path("forms/<int:pk>/template_sets/", views.DynamicFormTemplateSets.as_view()),
    path("pages/", views.DynamicFormPageListView.as_view()),
    path("pages/<int:pk>/", views.DynamicFormPageView.as_view()),
    path("pages/<int:pk>/next/", views.next_page_view),
    path("pages/success/<int:pk>/", views.DynamicFormSuccessPageView.as_view()),
]
urlpatterns += router.urls
