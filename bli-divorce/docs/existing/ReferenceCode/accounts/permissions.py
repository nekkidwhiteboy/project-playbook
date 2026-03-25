from rest_framework import permissions

from .models import User


class IsStaffRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role >= User.Role.Staff
        )


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role >= User.Role.Admin
        )


class IsOwnerRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.Owner
        )


class IsAdminRoleOrReadonly(permissions.BasePermission):
    def has_permission(self, request, view):
        authenticated = bool(request.user and request.user.is_authenticated)

        if authenticated:
            if request.method in permissions.SAFE_METHODS:
                return True

            return request.user.role >= User.Role.Admin

        return False


class CanInviteUser(permissions.BasePermission):
    def has_permission(self, request, view):

        if request.method in permissions.SAFE_METHODS:
            return True

        role = request.data.get("role", User.Role.Client)
        if role == User.Role.Owner:
            # Only Owners can invite other Owners
            return request.user.role == User.Role.Owner
        elif role >= User.Role.Staff:
            return request.user.has_perm("accounts.invite_staff")
        elif role <= User.Role.Client:
            return request.user.has_perm("accounts.invite_client")

        return False
