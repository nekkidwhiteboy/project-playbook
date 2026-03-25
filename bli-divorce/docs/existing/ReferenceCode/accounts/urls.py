from django.urls import include, path
from knox import views as knox_views
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("invites", views.UserInvitationsViewSet, basename="invites")

urlpatterns = router.urls + [
    path("register/", views.RegisterAPI.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", knox_views.LogoutView.as_view(), name="logout"),
    path("logoutall/", knox_views.LogoutAllView.as_view(), name="logoutall"),
    # path('change_password/', ChangePasswordView.as_view(), name='change_password'),
    path(
        "reset_password/",
        include("django_rest_passwordreset.urls", namespace="password_reset"),
    ),
    path("users/", views.UserQueryView.as_view(), name="users"),
    path("users/<int:pk>/", views.UserView.as_view(), name="user"),
    path("users/current/", views.CurrentUserView.as_view(), name="user_details"),
    path("events/", views.UserEvents.as_view(), name="user_events"),
]
