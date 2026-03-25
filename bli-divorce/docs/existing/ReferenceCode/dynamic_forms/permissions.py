from rest_framework import permissions

from accounts.models import User
from .models import DynamicForm


class CanCreateResult(permissions.BasePermission):

    def has_permission(self, request, view):
        user = request.user

        # Must alway be authenticated
        if not user or not user.is_authenticated:
            return False
        # Admins can always create new results
        if user.role >= User.Role.Admin:
            return True
        # Non Admins can only ever create results for themselves
        if request.data.get("owner", user.id) != user.id:
            return False

        # Make sure a form id or slug was specified
        if (formId := request.data.get("form")) or (slug := request.data.get("slug")):
            # Make sure the specified form exists
            if formId:
                try:
                    form = DynamicForm.objects.get(pk=formId)
                except DynamicForm.DoesNotExist:
                    return False
            else:
                try:
                    form = DynamicForm.objects.get(slug=slug)
                except DynamicForm.DoesNotExist:
                    return False

            # Get max_result_num based on user.role
            if user.role == User.Role.Client:
                max_result_num = form.max_results_per_client
            elif user.role == User.Role.Staff:
                max_result_num = form.max_results_per_staff
            else:
                # This should be unreachable since user.role >= User.Role.Admin was filtered out earlier
                raise TypeError("Invalid user.role")

            # If there is no limit set, a result can be created
            if max_result_num == None:
                return True
            # Make sure the user has less than the limit
            return len(user.results.filter(form=form)) < max_result_num
        return False
