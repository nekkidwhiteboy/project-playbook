from rest_framework import permissions


class CanGenerateDocs(permissions.BasePermission):
    message = "You do not have permission to generate documents."

    def has_permission(self, request, view):
        return request.user.has_perm("docxbuilder.generate_docs")
