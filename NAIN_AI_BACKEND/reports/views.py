# pyrefly: ignore [missing-import]
from django.shortcuts import render
# pyrefly: ignore [missing-import]
from rest_framework import generics, status
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView

from accounts.permissions import HasRole
from .models import Report
from .serializers import ReportSerializer


class ReportDetailView(generics.RetrieveAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]


class ReportPrintView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["HEALTH_WORKER", "DOCTOR", "ADMIN"]

    def get(self, request, pk):
        try:
            report = Report.objects.select_related(
                "screening",
                "screening__patient",
                "screening__created_by"
            ).get(pk=pk)
        except Report.DoesNotExist:
            return Response(
                {"detail": "Report not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        screening = report.screening
        patient = screening.patient if screening else None

        # Format confidence
        formatted_confidence = "N/A"
        if report.confidence is not None:
            try:
                conf = float(report.confidence)
                formatted_confidence = f"{conf * 100:.1f}%" if conf <= 1.0 else f"{conf:.1f}%"
            except (ValueError, TypeError):
                formatted_confidence = str(report.confidence)

        # Prediction status styling
        prediction_upper = (report.prediction or "").upper()
        if "NO DR" in prediction_upper or "NORMAL" in prediction_upper:
            banner_class = "status-success"
        elif "MILD" in prediction_upper:
            banner_class = "status-warning"
        elif any(term in prediction_upper for term in ["SEVERE", "PROLIFERATIVE", "MODERATE"]):
            banner_class = "status-danger"
        else:
            banner_class = "status-default"

        # Format probabilities
        probabilities_list = []
        if isinstance(report.probabilities, dict):
            for label, val in report.probabilities.items():
                try:
                    num = float(val)
                    pct = num * 100 if num <= 1.0 else num
                    probabilities_list.append({
                        "label": label,
                        "percent": f"{pct:.1f}%",
                        "bar_width": f"{min(max(pct, 0.0), 100.0):.1f}%",
                    })
                except (ValueError, TypeError):
                    probabilities_list.append({
                        "label": label,
                        "percent": str(val),
                        "bar_width": "0%",
                    })

        # Quality assessment metrics
        quality_data = report.quality_data or {}
        quality_metrics = []
        if isinstance(quality_data, dict):
            for key, val in quality_data.items():
                if key in ["overall", "passed_checks"]:
                    continue
                clean_name = key.replace("_pass", " Check").replace("_", " ").title()
                if isinstance(val, bool):
                    formatted_val = "PASS" if val else "FAIL"
                elif isinstance(val, float):
                    formatted_val = f"{val:.2f}"
                else:
                    formatted_val = str(val)
                quality_metrics.append({
                    "name": clean_name,
                    "value": formatted_val,
                })

        # Retinal analysis findings
        retinal_stage = None
        retinal_features = []
        if isinstance(report.retinal_analysis, dict):
            retinal_stage = report.retinal_analysis.get("stage")
            features_raw = report.retinal_analysis.get("features", [])
            if isinstance(features_raw, list):
                retinal_features = features_raw
            elif isinstance(features_raw, str):
                retinal_features = [features_raw]
        elif isinstance(report.retinal_analysis, list):
            retinal_features = report.retinal_analysis

        # Resolve image URLs
        resolved_original_image_url = None
        if report.original_image_url:
            if report.original_image_url.startswith("http"):
                resolved_original_image_url = report.original_image_url
            elif report.original_image_url.startswith("/results/"):
                resolved_original_image_url = f"http://127.0.0.1:8001{report.original_image_url}"
            else:
                resolved_original_image_url = report.original_image_url
        elif screening and screening.fundus_image:
            try:
                resolved_original_image_url = screening.fundus_image.url
            except Exception:
                resolved_original_image_url = None

        resolved_gradcam_url = None
        if report.gradcam_url:
            if report.gradcam_url.startswith("http"):
                resolved_gradcam_url = report.gradcam_url
            elif report.gradcam_url.startswith("/results/"):
                resolved_gradcam_url = f"http://127.0.0.1:8001{report.gradcam_url}"
            else:
                resolved_gradcam_url = report.gradcam_url

        context = {
            "report": report,
            "screening": screening,
            "patient": patient,
            "formatted_confidence": formatted_confidence,
            "banner_class": banner_class,
            "probabilities_list": probabilities_list,
            "quality_data": quality_data,
            "quality_metrics": quality_metrics,
            "retinal_stage": retinal_stage,
            "retinal_features": retinal_features,
            "resolved_original_image_url": resolved_original_image_url,
            "resolved_gradcam_url": resolved_gradcam_url,
        }

        return render(request, "reports/print_report.html", context)