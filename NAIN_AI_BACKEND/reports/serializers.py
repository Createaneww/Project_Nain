# pyrefly: ignore [missing-import]
from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    screening_id = serializers.IntegerField(
        source="screening.id",
        read_only=True
    )

    patient_name = serializers.CharField(
        source="screening.patient.full_name",
        read_only=True
    )

    class Meta:
        model = Report
        fields = [
            "id",
            "screening_id",
            "patient_name",
            "prediction",
            "confidence",
            "quality_data",
            "probabilities",
            "retinal_analysis",
            "original_image_url",
            "gradcam_url",
            "generated_at",
        ]

        read_only_fields = fields