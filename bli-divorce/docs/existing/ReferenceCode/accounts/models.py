from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.contrib.postgres.fields import HStoreField
from django.core.mail import EmailMultiAlternatives
from django.db import models
from django.dispatch import receiver
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django_rest_passwordreset.signals import reset_password_token_created
from django_rest_passwordreset.tokens import get_token_generator

from .signals import user_registered
from .util import raise_exception


class UserManager(BaseUserManager):
    """Define a model manager for User model with no username field."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        """Create and save a User with the given email and password."""

        if not email:
            raise ValueError("The given email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, role=0, **extra_fields):
        """Create and save a User with the given role."""

        assert User.Role.Client <= role <= User.Role.Owner

        extra_fields["is_staff"] = role >= User.Role.Staff
        extra_fields["is_superuser"] = role == User.Role.Owner
        extra_fields["role"] = role

        return self._create_user(email, password, **extra_fields)

    def create_client(self, email, password, **extra_fields):
        """Create and save a user with the role=User.Role.Client."""
        extra_fields["is_staff"] = False
        extra_fields["is_superuser"] = False
        extra_fields["role"] = User.Role.Client

        return self._create_user(email, password, **extra_fields)

    def create_staff_user(self, email, password, **extra_fields):
        """Create and save a User with role=User.Role.Staff."""

        extra_fields["is_staff"] = True
        extra_fields["is_superuser"] = False
        extra_fields["role"] = User.Role.Staff

        return self._create_user(email, password, **extra_fields)

    def create_admin_user(self, email, password, **extra_fields):
        """Create and save a User with the role=User.Role.Admin."""

        extra_fields["is_staff"] = True
        extra_fields["is_superuser"] = False
        extra_fields["role"] = User.Role.Admin

        return self._create_user(email, password, **extra_fields)

    def create_owner_user(self, email, password, **extra_fields):
        """Create and save a User with the role=User.Role.Owner."""
        extra_fields["is_staff"] = True
        extra_fields["is_superuser"] = True
        extra_fields["role"] = User.Role.Owner

        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """User model."""

    class Role(models.IntegerChoices):
        Client = 0, "Client"
        Staff = 1, "Staff"
        Admin = 2, "Admin"
        Owner = 3, "Owner"

    username = None
    email = models.EmailField(_("email address"), unique=True)
    role = models.SmallIntegerField(choices=Role.choices, default=Role.Client)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()


class UserEvent(models.Model):
    type = models.CharField(max_length=30)
    target = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="target_events", null=True
    )
    source = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="source_events", null=True
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=100, default="")
    detail = HStoreField(default=dict)


TOKEN_GENERATOR_CLASS = get_token_generator()


class UserInvitation(models.Model):
    class Meta:
        ordering = ["-created_time"]
        permissions = [
            (
                "invite_client",
                "Can create UserInvitations for user with role == User.Role.Client",
            ),
            (
                "invite_staff",
                "Can create UserInvitations for users with role >= User.Role.Staff",
            ),
        ]

    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(unique=True)
    role = models.SmallIntegerField(choices=User.Role.choices, default=User.Role.Client)
    initial_forms = models.ManyToManyField("dynamic_forms.DynamicForm", blank=True)
    expiration_time = models.DateTimeField(null=True)

    created_time = models.DateTimeField(auto_now_add=True)
    sent_time = models.DateTimeField(null=True)
    accepted_time = models.DateTimeField(null=True)
    subject = models.CharField(
        max_length=100,
        default="Invitation to join Barrow Brown Carrington, PLLC Client Portal",
    )

    key = models.CharField(max_length=64, db_index=True, unique=True)

    @staticmethod
    def generate_key():
        """generates a pseudo random code using os.urandom and binascii.hexlify"""
        return TOKEN_GENERATOR_CLASS.generate_token()

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = self.generate_key()
        return super(UserInvitation, self).save(*args, **kwargs)

    def send(self, request=None, base_url=None, resend=False):
        if self.pk is None:
            raise ValueError("Must call .save() on instance before sending")

        if not self.is_acceptable(require_sent=False):
            raise ValueError("Cannot send an invite that is not acceptable.")

        if request is None and base_url is None:
            raise ValueError("Either a base_url or request object must be provided.")

        if self.sent_time is not None and not resend:
            return

        sent_time = timezone.now()

        relative_url = f"/accept_invitation?token={self.key}"
        invitation_url = (
            request.build_absolute_uri(relative_url)
            if request
            else base_url + relative_url
        )
        context = {
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "invitation_url": invitation_url,
            "expiration_time": (
                self.expiration_time.astimezone(timezone.get_fixed_timezone(-500))
                if self.expiration_time
                else None
            ),
            "subject": self.subject,
        }

        email_html_message = render_to_string("email/user_invitation.html", context)
        email_text_message = render_to_string("email/user_invitation.txt", context)

        msg = EmailMultiAlternatives(
            # Subject:
            self.subject,
            # Message:
            email_text_message,
            # From:
            "Barrow Brown Carrington <supportteam@bbc.law>",
            # To:
            [self.email],
        )
        msg.attach_alternative(email_html_message, "text/html")
        msg.send()

        self.sent_time = sent_time
        self.save()

    @raise_exception(message="Invalid Token")
    def is_acceptable(self, require_sent=True):
        if require_sent and self.sent_time is None:
            # Don't allow an invite to be accepted if it has not yet been sent
            return False

        if self.accepted_time is not None:
            # Don't allow an invite to be accepted twice
            return False

        if self.is_expired():
            # Don't allow expired invites to be accepted
            return False

        try:
            # User with this email cannot already exist
            User.objects.get(email=self.email)
            return False
        except User.DoesNotExist:
            pass

        return True

    def is_expired(self):
        """Determines if this UserInvitation has expired.

        Invites without a expiration_time cannot expire
        """

        if self.expiration_time is None:
            # Invites without a expiration_time cannot expire
            return False

        return timezone.now() >= self.expiration_time

    def accept(self, password=None, first_name=None, last_name=None):
        if self.accepted_time is not None:
            raise ValueError("This invitation has already been accepted.")

        user = User.objects.create_user(
            email=self.email.lower(),
            password=password,
            role=self.role,
            first_name=first_name or self.first_name,
            last_name=last_name or self.last_name,
        )
        for form in self.initial_forms.all():
            user.results.create(form=form, items={})

        self.accepted_time = timezone.now()
        self.save()

        user_registered.send(sender=UserInvitation, user=user)

        return user


@receiver(reset_password_token_created)
def password_reset_token_created(
    sender, instance, reset_password_token, *args, **kwargs
):
    UserEvent.objects.create(
        type="PASSWORD_RESET_REQUEST",
        target=reset_password_token.user,
        source=None,
        description="Password reset was requested for this user",
        detail={
            "ip": reset_password_token.ip_address,
            "user_agent": reset_password_token.user_agent,
        },
    )

    context = {
        "current_user": reset_password_token.user,
        "username": reset_password_token.user.username,
        "email": reset_password_token.user.email,
        "reset_password_url": instance.request.build_absolute_uri(
            f"/reset_password?token={reset_password_token.key}"
        ),
    }

    email_html_message = render_to_string("email/user_reset_password.html", context)
    email_plaintext_message = render_to_string("email/user_reset_password.txt", context)

    msg = EmailMultiAlternatives(
        # title:
        "Password Reset for Barrow Brown Carrington",
        # message:
        email_plaintext_message,
        # from:
        "Barrow Brown Carrington Support <supportteam@bbc.law>",
        # to:
        [reset_password_token.user.email],
    )
    msg.attach_alternative(email_html_message, "text/html")
    msg.send()
