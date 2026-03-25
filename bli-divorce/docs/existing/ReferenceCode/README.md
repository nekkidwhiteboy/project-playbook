# Tomato Seed

## Installation

1. Install [Python 3.11](https://www.python.org/downloads/release/python-3116/)
2. Install [Node.js 18](https://nodejs.org/en/download/)
3. Install [PostgreSQL 16](https://www.postgresql.org/download/windows/)
4. Install JavaScript dependencies

    - `npm install`

5. Create Python virtual environment

    - `py -m venv tomato-seed`
    - `tomato-seed\Scripts\activate`

6. Install Python dependencies

    - `python -m pip install pip -U`
    - `python -m pip install -r requirements.txt`

7. Create `.env`

    See [Used Environment Variables](#used-environment-variables)

8. Apply migrations.

    - `python manage.py migrate`

9. Install fixtures

    - ```powershell
      python manage.py loaddata `
      dynamic_forms/fixtures/dynamic_form_pages.json `
      dynamic_forms/fixtures/dynamic_form_success_pages.json `
      dynamic_forms/fixtures/dynamic_forms.json `
      dynamic_forms/fixtures/next_rules.json `
      dynamic_forms/fixtures/pts_pages.json `
      dynamic_forms/fixtures/ohio_ucd_pages.json
      ```

10. Create First User

    ```python
    from accounts.models import User

    User.objects.create_user(
        email="*Insert User Email*",
        password="*Insert User Password*",
        role=User.Role.Owner, # Options: User.Role.[Client,Staff,Admin,Owner]
        first_name="*Insert User First Name*",
        last_name="* Insert User Last Name*"
    )
    ```

Set any needed permissions (See [Setting User Permissions](#setting-user-permissions))

## Running Locally

1. Run `npm run start`
2. Run `npm run server`
3. Navigate to [localhost:3000](http://localhost:3000)

## Available User Permissions

Users with `role=User.Role.Owner` _always_ have _all_ permissions. When a `Staff` or `Admin` user is created the following permissions must be set manually, if they are needed. If a User does not also have the necessary specified role, setting the permission will have no effect.

-   `accounts.invite_client` [Admin]
    -   Can create UserInvitations for user with role == User.Role.Client
-   `accounts.invite_staff` [Admin]
    -   Can create UserInvitations for users with role >= User.Role.Staff
-   `docxbuilder.generate_docs` [Admin/Staff]
    -   Can generate documents using this TemplateSet

## Setting User Permissions

The following code is an example of adding the `docxbuilder.generate_docs` permission to the `User` with id=1:

```python
# Get User
from accounts.models import User
user = User.objects.get(pk=1)

# Get Permission
from django.contrib.auth.models import Permission
perm = Permission.objects.get(codename='docxbuilder.generate_docs')

# Add Permission to User
user.user_permissions.add(perm)
```

**NOTE**: `user.has_perm()` will still return `False` until `user` is refetched

```python
...
user.has_perm("docxbuilder.generate_docs") # False
user = User.objects.get(pk=1) # Refetch user
user.has_perm("docxbuilder.generate_docs") # True
```

## Used Environment Variables

-   AWS_ACCESS_KEY_ID
-   AWS_SECRET_ACCESS_KEY
-   AWS_STORAGE_BUCKET_NAME
    -   tomato-seed-docxbuilder-templates-dev
-   DATABASE_URL
-   DEBUG
    -   True
-   EMAIL_HOST
    -   smtp.resend.com
-   EMAIL_HOST_USER
    -   resend
-   EMAIL_HOST_PASSWORD
-   REACT_APP_TINY_MCE_KEY
-   REACT_APP_SENTRY_DSN
-   REACT_APP_SENTRY_ENV
    -   development
-   SENTRY_DSN
-   SENTRY_ENV
    -   development
-   SENTRY_ORG
    -   barrow-brown-carrington
-   SENTRY_PROJECT
    -   tomatoseed-frontend
-   SENTRY_AUTH_TOKEN
-   SECRET_KEY
