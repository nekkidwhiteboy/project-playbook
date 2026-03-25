import logging

from axes.helpers import get_cool_off
from axes.signals import (
    user_locked_out,
    user_logged_in,
    user_logged_out,
    user_login_failed,
)
from django.contrib.auth import login
from django.contrib.auth.password_validation import validate_password
from django.dispatch import receiver
from django.forms import ValidationError
from django.utils import timezone
from django_filters.rest_framework import (
    DjangoFilterBackend,
    FilterSet,
    DateFromToRangeFilter,
    BaseInFilter,
    CharFilter,
    TypedMultipleChoiceFilter,
    BooleanFilter,
)
from django_rest_passwordreset.signals import post_password_reset
from knox.models import AuthToken
from knox.settings import knox_settings
from knox.views import LoginView as KnoxLoginView
from rest_framework import generics, permissions, status
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import SearchFilter
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import User, UserEvent, UserInvitation
from .permissions import IsStaffRole, IsAdminRole, CanInviteUser
from .serializers import (
    ChangePasswordSerializer,
    RegisterSerializer,
    UserSerializer,
    UserEventSerializer,
    UserInvitationSerializer,
    AcceptUserInvitationSerializer,
    VerifyUserInvitationSerializer,
)
from .signals import user_registered


access_logger = logging.getLogger("auth_logs")


class RegisterAPI(generics.GenericAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            validate_password(
                request.data["password"], User(email=serializer.validated_data["email"])
            )
        except ValidationError as e:
            return Response({"password": e}, 400)

        user = serializer.save()

        user_registered.send(sender=User, user=user)

        UserEvent.objects.create(
            type="REGISTER",
            target=user,
            source=request.user if request.user.is_authenticated else None,
            description="User registered",
            detail={
                "ip": get_client_ip(request),
                "user_agent": request.META["HTTP_USER_AGENT"],
            },
        )
        return Response(
            {
                "user": UserSerializer(
                    user, context=self.get_serializer_context()
                ).data,
                "token": AuthToken.objects.create(user)[1],
            }
        )


class LoginView(KnoxLoginView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, format=None):
        try:
            serializer = AuthTokenSerializer(
                data=request.data, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data["user"]
            login(request, user)

            # Copied from `KnoxLoginView.post`, but without sending a `user_logged_in` signal
            # It is already sent in the above call to `login`, so it does not need to be sent again
            token_limit_per_user = self.get_token_limit_per_user()
            if token_limit_per_user is not None:
                now = timezone.now()
                token = request.user.auth_token_set.filter(expiry__gt=now)
                if token.count() >= token_limit_per_user:
                    return Response(
                        {
                            "error": "Maximum amount of tokens allowed per user exceeded."
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
            token_ttl = self.get_token_ttl()
            instance, token = AuthToken.objects.create(request.user, token_ttl)

            data = self.get_post_response_data(request, token, instance)
            return Response(data)
        except PermissionDenied:
            return get_lockout_response(request)


class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    model = User

    def get_object(self, queryset=None):
        obj = self.request.user
        return obj

    def update(self, request, *args, **kwargs):
        self.object = self.get_object()
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            # Check old password
            if not self.object.check_password(serializer.data.get("old_password")):
                return Response(
                    {"old_password": ["Wrong password."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # set_password also hashes the password that the user will get
            self.object.set_password(serializer.data.get("new_password"))
            self.object.save()

            return Response(
                {
                    "status": "success",
                    "code": status.HTTP_200_OK,
                    "message": "Password updated successfully",
                }
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(generics.GenericAPIView):
    def get(self, request):
        return Response({"user": UserSerializer(request.user).data})


class UserFilterSet(FilterSet):
    role = TypedMultipleChoiceFilter(choices=User.Role.choices, coerce=int)
    is_active = BooleanFilter()

    role.always_filter = False

    class Meta:
        modal = User
        fields = ["role", "is_active"]


class UserQueryView(generics.ListAPIView):
    """Returns a list of users that match the provided query."""

    filter_backends = [SearchFilter, DjangoFilterBackend]
    filterset_class = UserFilterSet
    search_fields = ["email", "first_name", "last_name"]
    permission_classes = [IsStaffRole]
    queryset = User.objects.order_by("-pk").all()
    serializer_class = UserSerializer


class UserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_queryset(self):
        if self.request.user.role >= User.Role.Staff:
            return User.objects.order_by("-pk").all()
        return User.objects.filter(pk=self.request.user.pk)

    def update(self, request, *args, **kwargs):
        if "is_active" in request.data:
            instance = self.get_object()
            if (
                # Must have at least admin role
                request.user.role < User.Role.Admin
                # Must have at least the same role as the target user
                or request.user.role < instance.role
                # Cannot activate/deactivate yourself
                or request.user.id == instance.id
            ):
                raise PermissionDenied()

        return super().update(request, *args, **kwargs)


class CharInFilter(BaseInFilter, CharFilter):
    pass


class UserEventFilter(FilterSet):
    timestamp = DateFromToRangeFilter()
    type = CharInFilter()

    class Meta:
        model = UserEvent
        fields = ["timestamp", "type", "source", "target"]


class UserEvents(generics.ListAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = UserEventSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = UserEventFilter
    queryset = UserEvent.objects.order_by("-timestamp")

    @property
    def pagination_class(self):
        page_size = self.request.query_params.get(
            super().pagination_class.page_size_query_param, "auto"
        )
        if page_size == "auto":
            return None
        return super().pagination_class


class UserInvitationsViewSet(ModelViewSet):
    permission_classes = [IsAdminRole, CanInviteUser]
    serializer_class = UserInvitationSerializer
    queryset = UserInvitation.objects.all()

    def create(self, request, *args, **kwargs):
        res = super().create(request, *args, **kwargs)
        UserEvent.objects.create(
            type="INVITE_CREATED",
            target=None,
            source=request.user,
            description="User created invitation",
            detail={
                "ip": get_client_ip(request),
                "user_agent": request.META["HTTP_USER_AGENT"],
                "email": request.data["email"],
                "role": request.data.get("role", User.Role.Client),
                "expiration_time": request.data.get("expiration_time", None),
            },
        )
        return res

    @action(methods=["post"], permission_classes=[AllowAny], detail=False)
    def accept(self, request):
        try:
            invitation = self.get_queryset().get(key=request.data["token"])
            invitation.is_acceptable(raise_exception=True)
        except:
            return Response({"message": "Invalid Token"}, status.HTTP_400_BAD_REQUEST)

        serializer = AcceptUserInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            password = request.data["password"]
            validate_password(password, User(email=invitation.email))
        except ValidationError as e:
            return Response({"password": e}, status.HTTP_400_BAD_REQUEST)

        user = invitation.accept(
            password=password,
            first_name=serializer.validated_data["first_name"],
            last_name=serializer.validated_data["last_name"],
        )
        UserEvent.objects.create(
            type="INVITE_ACCEPTED",
            target=user,
            source=request.user if request.user.is_authenticated else None,
            description="User accepted invitation",
            detail={
                "ip": get_client_ip(request),
                "user_agent": request.META["HTTP_USER_AGENT"],
            },
        )
        return Response(
            {
                "user": UserSerializer(
                    user, context=self.get_serializer_context()
                ).data,
                "token": AuthToken.objects.create(user)[1],
            }
        )

    @action(methods=["post"], permission_classes=[AllowAny], detail=False)
    def verify(self, request):
        try:
            invitation = self.get_queryset().get(key=request.data["token"])
            invitation.is_acceptable(raise_exception=True)
            serializer = VerifyUserInvitationSerializer(invitation)
            return Response(serializer.data)
        except:
            return Response({"message": "Invalid token"}, status.HTTP_400_BAD_REQUEST)

    @action(methods=["post"], detail=True)
    def send(self, request, pk=None):
        resend = request.data.get("resend", False)
        instance = self.get_object()

        if not instance.is_acceptable(require_sent=False):
            return Response(
                "Invite has already been accepted or has expired",
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            instance.send(request=request, resend=resend)
            serializer = self.get_serializer(instance)
            UserEvent.objects.create(
                type="INVITE_SENT",
                target=None,
                source=request.user,
                description="User invitation sent",
                detail={
                    "ip": get_client_ip(request),
                    "user_agent": request.META["HTTP_USER_AGENT"],
                    "email": instance.email,
                    "role": instance.role,
                    "expiration_time": instance.expiration_time,
                    "sent_time": instance.sent_time,
                },
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        except:
            return Response(
                "Unable to send mail", status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


def get_lockout_response(request, *args, **kwargs):
    cooloff = get_cool_off()
    if cooloff is not None:
        cooloff = cooloff.total_seconds()

    return Response(
        {"status": "Too many failed login attempts.", "cooloff_time": cooloff},
        status=403,
    )


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


def get_active_session_count(user: User):
    if knox_settings.TOKEN_LIMIT_PER_USER is not None:
        now = timezone.now()
        tokens = user.auth_token_set.filter(expiry__gt=now)
    else:
        tokens = user.auth_token_set

    return tokens.count()


@receiver(user_locked_out)
def on_user_locked_out(*args, username=None, ip_address=None, **kwargs):
    try:
        user = User.objects.get(email=username)
        UserEvent.objects.create(
            type="LOCKOUT",
            target=user,
            source=None,
            description=f"User locked out due to too many failed attempts",
            detail={"ip": ip_address},
        )
        access_logger.info(f"LOCKOUT for user={user.id} from ip={ip_address}")
    except User.DoesNotExist:
        pass
    finally:
        raise PermissionDenied("Too many failed login attempts")


@receiver(user_logged_in)
def on_user_logged_in(*args, user=None, request=None, **kwargs):
    ip = get_client_ip(request)
    sessions = str(
        get_active_session_count(user)
        # +1 because the token isn't created until after `login` is called
        + 1
    )
    UserEvent.objects.create(
        type="LOGIN",
        target=user,
        source=None,
        description=f"User logged in",
        detail={
            "ip": ip,
            "user_agent": request.META["HTTP_USER_AGENT"],
            "session_count": sessions,
        },
    )
    access_logger.info(f"LOGIN for user={user.id} from ip={ip}")


@receiver(user_logged_out)
def on_user_logged_out(*args, user=None, request=None, **kwargs):
    ip = get_client_ip(request)
    sessions = str(get_active_session_count(user))
    UserEvent.objects.create(
        type="LOGOUT",
        target=user,
        source=user,
        description=f"User logged out",
        detail={
            "ip": ip,
            "user_agent": request.META["HTTP_USER_AGENT"],
            "session_count": sessions,
        },
    )
    access_logger.info(f"LOGOUT for user={user.id} from ip={ip}")


@receiver(user_login_failed)
def on_user_login_failed(*args, request=None, **kwargs):
    try:
        user = User.objects.get(email=request.data.get("username"))
    except User.DoesNotExist:
        access_logger.info(f"LOGIN_FAILURE from ip={get_client_ip(request)}")
        return

    ip = get_client_ip(request)
    UserEvent.objects.create(
        type="LOGIN_FAILURE",
        target=user,
        source=request.user if request.user.is_authenticated else None,
        description="Failed login attempt",
        detail={
            "ip": ip,
            "user_agent": request.META["HTTP_USER_AGENT"],
        },
    )
    access_logger.info(f"LOGIN_FAILURE for user={user.id} from ip={ip}")


@receiver(post_password_reset)
def on_password_reset(*args, user=None, **kwargs):
    UserEvent.objects.create(
        type="PASSWORD_RESET",
        target=user,
        source=None,
        description="User's password was reset",
        detail={},
    )
