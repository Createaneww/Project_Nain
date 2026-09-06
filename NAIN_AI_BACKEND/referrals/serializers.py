# pyrefly: ignore [missing-import]
from rest_framework import serializers
from .models import Referral
from patients.models import Patient
from screenings.models import Screening
from reports.models import Report


class ReferralPatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            "id",
            "full_name",
            "age",
            "gender",
            "phone_number",
            "email",
            "address",
        ]


class ReferralScreeningSerializer(serializers.ModelSerializer):
    fundus_image = serializers.SerializerMethodField()

    class Meta:
        model = Screening
        fields = [
            "id",
            "status",
            "fundus_image",
            "created_at",
        ]

    def get_fundus_image(self, obj):
        if obj and obj.fundus_image:
            try:
                return obj.fundus_image.url
            except Exception:
                return None
        return None


class ReferralReportSerializer(serializers.ModelSerializer):
    fundus_image = serializers.SerializerMethodField()
    gradcam_image = serializers.SerializerMethodField()
    detected_stage = serializers.SerializerMethodField()
    retinal_findings = serializers.SerializerMethodField()
    key_features = serializers.SerializerMethodField()
    observations = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            "id",
            "prediction",
            "confidence",
            "probabilities",
            "quality_data",
            "retinal_analysis",
            "original_image_url",
            "gradcam_url",
            "fundus_image",
            "gradcam_image",
            "detected_stage",
            "retinal_findings",
            "key_features",
            "observations",
            "generated_at",
        ]

    def get_fundus_image(self, obj):
        if not obj:
            return None
        if obj.original_image_url:
            return obj.original_image_url
        if obj.screening and obj.screening.fundus_image:
            try:
                return obj.screening.fundus_image.url
            except Exception:
                pass
        return None

    def get_gradcam_image(self, obj):
        if not obj:
            return None
        return obj.gradcam_url

    def get_detected_stage(self, obj):
        if not obj:
            return None
        ra = obj.retinal_analysis
        if isinstance(ra, dict):
            stage = ra.get("stage") or ra.get("detected_stage")
            if stage:
                return stage
        pred = (obj.prediction or "").strip()
        pred_upper = pred.upper()
        if "SEVERE" in pred_upper:
            return "Severe NPDR"
        elif "PROLIFERATIVE" in pred_upper:
            return "Proliferative DR"
        elif "MODERATE" in pred_upper:
            return "Moderate NPDR"
        elif "MILD" in pred_upper:
            return "Mild NPDR"
        elif "NO DR" in pred_upper or "NORMAL" in pred_upper:
            return "No DR"
        return pred or None

    def _extract_features(self, obj):
        if not obj:
            return []
        ra = obj.retinal_analysis
        if isinstance(ra, dict):
            feats = (
                ra.get("features")
                or ra.get("findings")
                or ra.get("key_features")
                or ra.get("observations")
            )
            if isinstance(feats, list):
                return feats
            elif isinstance(feats, str):
                return [feats]
        elif isinstance(ra, list):
            return ra
        elif isinstance(ra, str):
            return [ra]
        return []

    def get_retinal_findings(self, obj):
        return self._extract_features(obj)

    def get_key_features(self, obj):
        return self._extract_features(obj)

    def get_observations(self, obj):
        feats = self._extract_features(obj)
        ra = obj.retinal_analysis if obj else None
        if isinstance(ra, dict) and ra.get("notes"):
            notes = ra.get("notes")
            if isinstance(notes, list):
                return feats + [n for n in notes if n not in feats]
            elif isinstance(notes, str) and notes not in feats:
                return feats + [notes]
        return feats


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

    priority = serializers.CharField(
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

    collected_by_role = serializers.CharField(
        source="collected_by.role",
        read_only=True,
        allow_null=True
    )

    retinal_analysis = serializers.JSONField(
        source="report.retinal_analysis",
        read_only=True
    )

    confidence = serializers.FloatField(
        source="report.confidence",
        read_only=True,
        allow_null=True
    )

    available_for_claim = serializers.BooleanField(
        read_only=True
    )

    ai_report = ReferralReportSerializer(
        source="report",
        read_only=True
    )

    patient = ReferralPatientSerializer(
        source="report.screening.patient",
        read_only=True
    )

    screening = ReferralScreeningSerializer(
        source="report.screening",
        read_only=True
    )

    referral = serializers.SerializerMethodField()

    def get_referral(self, obj):
        return {
            "id": obj.id,
            "status": obj.status,
            "priority": obj.priority,
            "available_for_claim": obj.available_for_claim,
            "assigned_doctor": obj.assigned_doctor_id,
            "assigned_doctor_name": obj.assigned_doctor.full_name if obj.assigned_doctor else None,
            "doctor_notes": obj.doctor_notes,
            "reviewed_at": obj.reviewed_at.isoformat() if obj.reviewed_at else None,
            "collected_at": obj.collected_at.isoformat() if obj.collected_at else None,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
            "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
        }

    class Meta:
        model = Referral
        fields = [
            "id",
            "report_id",
            "screening_id",
            "patient_id",
            "patient_name",
            "prediction",
            "confidence",
            "priority",
            "assigned_doctor",
            "assigned_doctor_name",
            "status",
            "available_for_claim",
            "doctor_notes",
            "reviewed_at",
            "collected_at",
            "collected_by",
            "collected_by_name",
            "collected_by_role",
            "retinal_analysis",
            "ai_report",
            "patient",
            "screening",
            "referral",
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
            "confidence",
            "priority",
            "assigned_doctor_name",
            "collected_by_name",
            "collected_by_role",
            "retinal_analysis",
            "ai_report",
            "patient",
            "screening",
            "referral",
            "available_for_claim",
            "status",
            "doctor_notes",
            "reviewed_at",
            "collected_at",
            "collected_by",
            "created_at",
            "updated_at",
        ]