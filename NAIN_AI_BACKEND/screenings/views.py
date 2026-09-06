import os
import mimetypes
import requests
# pyrefly: ignore [missing-import]
from django.conf import settings
from django.db import transaction
# pyrefly: ignore [missing-import]
from rest_framework import generics
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated

from reports.models import Report

from .models import Screening
from .serializers import ScreeningSerializer
from accounts.permissions import HasRole

# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework import status


from reports.serializers import ReportSerializer
from referrals.models import Referral


class ScreeningListCreateView(generics.ListCreateAPIView):
    serializer_class = ScreeningSerializer
    permission_classes = [IsAuthenticated, HasRole]

    allowed_roles = ["HEALTH_WORKER", "ADMIN"]

    def get_queryset(self):
        queryset = Screening.objects.all().order_by("-created_at")
        patient_id = self.request.query_params.get("patient_id")
        created_by = self.request.query_params.get("created_by")
        date = self.request.query_params.get("date")

        if patient_id:
            try:
                queryset = queryset.filter(patient_id=int(patient_id))
            except (ValueError, TypeError):
                queryset = queryset.none()
        if created_by:
            try:
                queryset = queryset.filter(created_by_id=int(created_by))
            except (ValueError, TypeError):
                queryset = queryset.none()
        if date:
            try:
                queryset = queryset.filter(created_at__date=date.strip())
            except Exception:
                queryset = queryset.none()

        return queryset

    def perform_create(self, serializer):
        screening = serializer.save(created_by=self.request.user)
        from accounts.activity import log_activity
        patient_name = screening.patient.full_name if screening.patient else ""
        log_activity(
            event_type="SCREENING_CREATED",
            category="SCREENING",
            details=f"Screening session #{screening.id} initiated for patient {patient_name}.",
            actor=self.request.user,
            entity_type="Screening",
            entity_id=screening.id,
            patient_id=screening.patient.id if screening.patient else None,
            patient_name=patient_name,
        )

class ScreeningDetailView(generics.RetrieveAPIView):
    queryset = Screening.objects.all()
    serializer_class = ScreeningSerializer
    permission_classes = [IsAuthenticated, HasRole]

    allowed_roles = ["HEALTH_WORKER", "ADMIN"]

class ScreeningImageUploadView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["HEALTH_WORKER"]

    def post(self, request, pk):
        try:
            screening = Screening.objects.get(pk=pk)
        except Screening.DoesNotExist:
            return Response(
                {"detail": "Screening not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if "fundus_image" not in request.FILES:
            return Response(
                {"detail": "fundus_image is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        screening.fundus_image = request.FILES["fundus_image"]
        screening.status = "IMAGE_UPLOADED"
        screening.save()

        from accounts.activity import log_activity
        patient_name = screening.patient.full_name if screening.patient else ""
        log_activity(
            event_type="IMAGE_UPLOADED",
            category="SCREENING",
            details=f"Retinal fundus image uploaded for screening #{screening.id}.",
            actor=request.user,
            entity_type="Screening",
            entity_id=screening.id,
            patient_id=screening.patient.id if screening.patient else None,
            patient_name=patient_name,
        )

        return Response(
            ScreeningSerializer(screening).data,
            status=status.HTTP_200_OK
        )
class ScreeningAnalyzeView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["HEALTH_WORKER"]

    def post(self, request, pk):
        try:
            screening = Screening.objects.get(pk=pk)
        except Screening.DoesNotExist:
            return Response(
                {"detail": "Screening not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if not screening.fundus_image:
            return Response(
                {"detail": "Please upload a fundus image before analysis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        previous_status = screening.status
        screening.status = "PROCESSING"
        screening.save(update_fields=["status", "updated_at"])

        try:
            with screening.fundus_image.open("rb") as image_file:
                filename = os.path.basename(screening.fundus_image.name)
                content_type = mimetypes.guess_type(filename)[0] or "image/jpeg"

                files = {
                    "file": (
                        filename,
                        image_file,
                        content_type
                    )
                }

                ml_response = requests.post(
                    "http://127.0.0.1:8001/analyze",
                    files=files,
                    timeout=120
                )

            if ml_response.status_code != 200:
                revert_status = "IMAGE_UPLOADED" if previous_status in ["PROCESSING", "FAILED"] else previous_status
                screening.status = revert_status
                screening.save(update_fields=["status", "updated_at"])
                return Response(
                    {
                        "detail": f"AI service returned an error (HTTP {ml_response.status_code}).",
                        "error": ml_response.text
                    },
                    status=status.HTTP_502_BAD_GATEWAY
                )

            ml_result = ml_response.json()

            # Validate prediction result structure from ML service
            status_flag = ml_result.get("status")
            prediction = ml_result.get("prediction")
            confidence = ml_result.get("confidence")

            if status_flag == "REJECTED" or prediction is None or confidence is None or not str(prediction).strip():
                revert_status = "IMAGE_UPLOADED" if previous_status in ["PROCESSING", "FAILED"] else previous_status
                screening.status = revert_status
                screening.save(update_fields=["status", "updated_at"])

                error_message = (
                    ml_result.get("message")
                    or "AI inference could not generate a valid diagnostic prediction from this image."
                )
                return Response(
                    {
                        "detail": error_message,
                        "error": "INFERENCE_VALIDATION_FAILED",
                        "quality_data": ml_result.get("quality"),
                        "screening_id": screening.id,
                        "status": screening.status,
                    },
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY
                )

            # Ensure confidence is a float
            try:
                confidence_val = float(confidence)
            except (ValueError, TypeError):
                confidence_val = 0.0

            prediction_str = str(prediction).strip()

            with transaction.atomic():
                # Save ML analysis result on Screening
                screening.prediction = prediction_str
                screening.confidence = confidence_val
                screening.quality_data = ml_result.get("quality")
                screening.probabilities = ml_result.get("probabilities")
                screening.retinal_analysis = ml_result.get("retinal_analysis")
                screening.original_image_url = ml_result.get("original_image_url")
                screening.gradcam_url = ml_result.get("gradcam_url")
                screening.status = "COMPLETED"
                screening.save()

                # Save or update Report with prediction populated (idempotent, avoids duplicates on retry)
                report, created = Report.objects.update_or_create(
                    screening=screening,
                    defaults={
                        "prediction": prediction_str,
                        "confidence": confidence_val,
                        "quality_data": ml_result.get("quality"),
                        "probabilities": ml_result.get("probabilities"),
                        "retinal_analysis": ml_result.get("retinal_analysis"),
                        "original_image_url": ml_result.get("original_image_url"),
                        "gradcam_url": ml_result.get("gradcam_url"),
                    }
                )

                # Maintain referral workflow idempotently
                referral, ref_created = Referral.objects.get_or_create(
                    report=report
                )

            # Activity logging and notifications outside atomic block
            try:
                from accounts.activity import log_activity
                patient_name = screening.patient.full_name if screening.patient else ""
                log_activity(
                    event_type="AI_ANALYSIS_COMPLETED",
                    category="AI_ANALYSIS",
                    details=f"AI diagnostic inference completed: {screening.prediction} (Confidence: {int(screening.confidence * 100 if screening.confidence else 0)}%).",
                    actor=request.user,
                    entity_type="Report",
                    entity_id=report.id,
                    patient_id=screening.patient.id if screening.patient else None,
                    patient_name=patient_name,
                )
                if ref_created:
                    log_activity(
                        event_type="REFERRAL_CREATED",
                        category="REFERRAL",
                        details=f"Specialist referral #{referral.id} created for patient {patient_name}.",
                        actor=request.user,
                        entity_type="Referral",
                        entity_id=referral.id,
                        patient_id=screening.patient.id if screening.patient else None,
                        patient_name=patient_name,
                    )
                    from accounts.notifications import notify_admins
                    notify_admins(
                        type="REFERRAL_PENDING",
                        title="New Referral Pending",
                        message=f"A new referral for {patient_name or f'Patient #{screening.patient_id}'} requires assignment.",
                        related_entity_type="Referral",
                        related_entity_id=referral.id,
                        action_url=f"/admin/referrals/{referral.id}",
                    )
            except Exception:
                pass

            return Response(
                {
                    "success": True,
                    "message": "AI analysis completed successfully",
                    "detail": "Image analyzed successfully.",
                    "screening_id": screening.id,
                    "report_id": report.id,
                    "prediction": report.prediction,
                    "confidence": report.confidence,
                    "status": screening.status,
                    "ml_result": ml_result,
                },
                status=status.HTTP_200_OK
            )

        except requests.exceptions.RequestException as e:
            revert_status = "IMAGE_UPLOADED" if previous_status in ["PROCESSING", "FAILED"] else previous_status
            screening.status = revert_status
            screening.save(update_fields=["status", "updated_at"])

            return Response(
                {
                    "detail": "AI inference service is currently unavailable.",
                    "error": str(e)
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            revert_status = "IMAGE_UPLOADED" if previous_status in ["PROCESSING", "FAILED"] else previous_status
            screening.status = revert_status
            screening.save(update_fields=["status", "updated_at"])

            return Response(
                {
                    "detail": f"An unexpected error occurred during analysis: {str(e)}",
                    "error": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
class ScreeningReportView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["HEALTH_WORKER", "ADMIN", "DOCTOR"]

    def get(self, request, pk):
        try:
            screening = Screening.objects.get(pk=pk)
        except Screening.DoesNotExist:
            return Response(
                {"detail": "Screening not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            report = screening.report
        except Report.DoesNotExist:
            return Response(
                {"detail": "Report not available for this screening yet."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            ReportSerializer(report).data,
            status=status.HTTP_200_OK
        )