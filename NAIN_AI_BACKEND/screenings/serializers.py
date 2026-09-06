# pyrefly: ignore [missing-import]
from rest_framework import serializers
from .models import Screening


class ScreeningSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source="patient.full_name",
        read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.username",
        read_only=True
    )
    report_id = serializers.SerializerMethodField()

    class Meta:
        model = Screening
        fields = [
            "id",
            "patient",
            "patient_name",
            "fundus_image",
            "status",
            "prediction",
            "confidence",
            "report_id",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "fundus_image",
            "status",
            "prediction",
            "confidence",
            "report_id",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_report_id(self, obj):
        try:
            return obj.report.id
        except (AttributeError, Exception):
            return None