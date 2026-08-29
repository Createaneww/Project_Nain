# pyrefly: ignore [missing-import]
from rest_framework import serializers
from .models import Referral


class ReferralSerializer(serializers.ModelSerializer):
    report_id = serializers.IntegerField(
        source="report.id",
        read_only=True
    )

    screening_id = serializers.IntegerField(
        source="report.screening.id",
        read_only=True
    )

    patient_id = serializers.IntegerField(
        source="report.screening.patient.id",
        read_only=True
    )

    patient_name = serializers.CharField(
        source="report.screening.patient.full_name",
        read_only=True
    )

    prediction = serializers.CharField(
        source="report.prediction",
        read_only=True
    )

    assigned_doctor_name = serializers.CharField(
        source="assigned_doctor.full_name",
        read_only=True,
        allow_null=True
    )

    collected_by_name = serializers.CharField(
        source="collected_by.full_name",
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = Referral
        fields = [
            "id",
            "report_id",
            "screening_id",
            "patient_id",
            "patient_name",
            "prediction",
            "assigned_doctor",
            "assigned_doctor_name",
            "status",
            "doctor_notes",
            "reviewed_at",
            "collected_at",
            "collected_by",
            "collected_by_name",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "report_id",
            "screening_id",
            "patient_id",
            "patient_name",
            "prediction",
            "assigned_doctor_name",
            "collected_by_name",
            "status",
            "doctor_notes",
            "reviewed_at",
            "collected_at",
            "collected_by",
            "created_at",
            "updated_at",
        ]