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

    detected_stage = serializers.SerializerMethodField()
    retinal_findings = serializers.SerializerMethodField()
    key_features = serializers.SerializerMethodField()
    observations = serializers.SerializerMethodField()

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
            "detected_stage",
            "retinal_findings",
            "key_features",
            "observations",
            "original_image_url",
            "gradcam_url",
            "generated_at",
        ]

        read_only_fields = fields

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