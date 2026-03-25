from rest_framework import serializers

from .models import User, UserEvent, UserInvitation


class ChangePasswordSerializer(serializers.Serializer):
    class Meta:
        model = User

    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "role", "first_name", "last_name", "is_active")
        read_only_fields = ("id", "role", "email")


class RegisterSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(allow_blank=False, required=True)
    last_name = serializers.CharField(allow_blank=False, required=True)

    class Meta:
        model = User
        fields = ("id", "email", "password", "first_name", "last_name")
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        user = User.objects.create_client(
            validated_data["email"],
            validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
        )

        return user

    def validate_email(self, value):
        try:
            UserInvitation.objects.get(email=value)
            raise serializers.ValidationError("This email is unavailable")
        except UserInvitation.DoesNotExist:
            return value.lower()


class UserEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserEvent
        fields = "__all__"
        read_only_fields = ["__all__"]


class UserInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserInvitation
        exclude = ["key"]
        read_only_fields = ["id", "created_time", "sent_time", "accepted_time"]

    def validate_email(self, value):
        try:
            User.objects.get(email=value)
            raise serializers.ValidationError("User with this email already exists")
        except User.DoesNotExist:
            return value.lower()


class VerifyUserInvitationSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()


class AcceptUserInvitationSerializer(serializers.Serializer):
    token = serializers.CharField(allow_blank=False, required=True)
    first_name = serializers.CharField(allow_blank=False, required=True)
    last_name = serializers.CharField(allow_blank=False, required=True)
    password = serializers.CharField(allow_blank=False, required=True)
