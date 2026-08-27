# pyrefly: ignore [missing-import]
from django.urls import include, path
# pyrefly: ignore [missing-import]
from django.contrib import admin

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/patients/", include("patients.urls")),
]