# pyrefly: ignore [missing-import]
from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "full_name",
        "age",
        "gender",
        "phone_number",
        "email",
        "created_by",
        "created_at",
    )

    search_fields = (
        "full_name",
        "phone_number",
        "email",
    )

    list_filter = (
        "gender",
        "created_at",
    )
