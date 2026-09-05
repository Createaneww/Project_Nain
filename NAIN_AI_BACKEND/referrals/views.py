# pyrefly: ignore [missing-import]
from django.utils import timezone
# pyrefly: ignore [missing-import]
from rest_framework import generics, status
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import HasRole
from .models import Referral
from .serializers import ReferralSerializer


class ReferralListView(generics.ListAPIView):
    serializer_class = ReferralSerializer
    permission_classes = [IsAuthenticated, HasRole]

    allowed_roles = ["ADMIN", "HEALTH_WORKER", "DOCTOR"]

    def get_queryset(self):
        queryset = Referral.objects.select_related(
            "report",
            "report__screening",
            "report__screening__patient",
            "assigned_doctor",
            "collected_by",
        ).order_by("-created_at")

        status_param = self.request.query_params.get("status")
        doctor_id = self.request.query_params.get("doctor_id")
        patient_id = self.request.query_params.get("patient_id")

        if status_param:
            queryset = queryset.filter(status__iexact=status_param.strip())
        if doctor_id:
            try:
                queryset = queryset.filter(assigned_doctor_id=int(doctor_id))
            except (ValueError, TypeError):
                queryset = queryset.none()
        if patient_id:
            try:
                queryset = queryset.filter(report__screening__patient_id=int(patient_id))
            except (ValueError, TypeError):
                queryset = queryset.none()

        return queryset


class ReferralDetailView(generics.RetrieveAPIView):
    serializer_class = ReferralSerializer
    permission_classes = [IsAuthenticated, HasRole]

    allowed_roles = ["ADMIN", "HEALTH_WORKER", "DOCTOR"]

    def get_queryset(self):
        return Referral.objects.select_related(
            "report",
            "report__screening",
            "report__screening__patient",
            "assigned_doctor",
            "collected_by",
        )


class ReferralAssignDoctorView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["ADMIN", "HEALTH_WORKER", "DOCTOR"]

    def patch(self, request, pk):
        try:
            referral = Referral.objects.select_related(
                "report",
                "report__screening",
                "report__screening__patient",
                "assigned_doctor",
                "collected_by",
            ).get(pk=pk)
        except Referral.DoesNotExist:
            return Response(
                {"detail": "Referral not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        doctor_id = request.data.get("doctor_id")
        if doctor_id is None:
            return Response(
                {"detail": "doctor_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            doctor = User.objects.get(pk=doctor_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "Doctor user not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if doctor.role != User.Role.DOCTOR:
            return Response(
                {"detail": "Selected user is not a Doctor."},
                status=status.HTTP_400_BAD_REQUEST
            )

        was_already_assigned = referral.assigned_doctor is not None
        referral.assigned_doctor = doctor
        referral.status = "ASSIGNED"
        referral.save()

        try:
            from accounts.activity import log_activity
            patient = getattr(referral, "patient", None)
            patient_name = patient.full_name if patient else ""
            patient_id = patient.id if patient else None

            log_activity(
                event_type="DOCTOR_REASSIGNED" if was_already_assigned else "DOCTOR_ASSIGNED",
                category="REFERRAL",
                details=f"Referral #{referral.id} {'reassigned' if was_already_assigned else 'assigned'} to Dr. {doctor.full_name or doctor.username}.",
                actor=request.user,
                entity_type="Referral",
                entity_id=referral.id,
                patient_id=patient_id,
                patient_name=patient_name,
            )

            from accounts.notifications import create_notification
            create_notification(
                recipient=doctor,
                type="CASE_ASSIGNED",
                title="New Case Assigned",
                message=f"You have been assigned a new case for {patient_name or f'Patient #{patient_id}'}.",
                related_entity_type="Referral",
                related_entity_id=referral.id,
                action_url=f"/doctor/referrals/{referral.id}",
            )
        except Exception:
            pass

        return Response(
            ReferralSerializer(referral).data,
            status=status.HTTP_200_OK
        )


class ReferralReviewView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["DOCTOR"]

    def patch(self, request, pk):
        try:
            referral = Referral.objects.select_related(
                "report",
                "report__screening",
                "report__screening__patient",
                "assigned_doctor",
                "collected_by",
            ).get(pk=pk)
        except Referral.DoesNotExist:
            return Response(
                {"detail": "Referral not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if not referral.assigned_doctor:
            return Response(
                {"detail": "No doctor has been assigned to this referral."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if referral.assigned_doctor_id != request.user.id:
            return Response(
                {"detail": "You are not assigned to review this referral."},
                status=status.HTTP_403_FORBIDDEN
            )

        if referral.status != "ASSIGNED":
            return Response(
                {"detail": f"Referral cannot be reviewed in '{referral.status}' status. Status must be 'ASSIGNED'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        doctor_notes = request.data.get("doctor_notes")
        if doctor_notes is None or not str(doctor_notes).strip():
            return Response(
                {"detail": "doctor_notes is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        referral.doctor_notes = str(doctor_notes).strip()
        referral.status = "REVIEWED"
        referral.reviewed_at = timezone.now()
        referral.save()

        try:
            from accounts.activity import log_activity
            patient = getattr(referral, "patient", None)
            patient_name = patient.full_name if patient else ""
            patient_id = patient.id if patient else None

            log_activity(
                event_type="CLINICAL_EVALUATION_SUBMITTED",
                category="CLINICAL_EVALUATION",
                details=f"Clinical evaluation and diagnosis submitted by Dr. {request.user.full_name or request.user.username} for referral #{referral.id}.",
                actor=request.user,
                entity_type="Referral",
                entity_id=referral.id,
                patient_id=patient_id,
                patient_name=patient_name,
            )

            from accounts.notifications import notify_admins, create_notification
            # Notify Admins
            notify_admins(
                type="CLINICAL_REVIEW_COMPLETED",
                title="Clinical Review Completed",
                message=f"Dr. {request.user.full_name or request.user.username} completed the review for {patient_name or f'Patient #{patient_id}'}.",
                related_entity_type="Referral",
                related_entity_id=referral.id,
                action_url=f"/admin/referrals/{referral.id}",
            )

            # Notify responsible Health Worker if available
            try:
                creator = referral.report.screening.created_by
                if creator and creator.role == User.Role.HEALTH_WORKER:
                    create_notification(
                        recipient=creator,
                        type="REPORT_READY_FOR_COLLECTION",
                        title="Report Ready for Collection",
                        message=f"The clinical review for {patient_name or f'Patient #{patient_id}'} is complete and the report is ready for collection.",
                        related_entity_type="Referral",
                        related_entity_id=referral.id,
                        action_url=f"/health-worker/referrals/{referral.id}",
                    )
            except Exception:
                pass
        except Exception:
            pass

        return Response(
            ReferralSerializer(referral).data,
            status=status.HTTP_200_OK
        )


class ReferralCollectView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["HEALTH_WORKER", "ADMIN"]

    def patch(self, request, pk):
        try:
            referral = Referral.objects.select_related(
                "report",
                "report__screening",
                "report__screening__patient",
                "assigned_doctor",
                "collected_by",
            ).get(pk=pk)
        except Referral.DoesNotExist:
            return Response(
                {"detail": "Referral not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if referral.status != "REVIEWED":
            return Response(
                {"detail": f"Referral must be in 'REVIEWED' status before collection. Current status: '{referral.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        referral.status = "COLLECTED"
        referral.collected_at = timezone.now()
        referral.collected_by = request.user
        referral.save()

        try:
            from accounts.activity import log_activity
            patient = getattr(referral, "patient", None)
            patient_name = patient.full_name if patient else ""
            patient_id = patient.id if patient else None
            method = "Admin Office" if getattr(request.user, "role", "") == "ADMIN" else "Health Worker Field"

            log_activity(
                event_type="REPORT_COLLECTED",
                category="COLLECTION",
                details=f"Final screening report #{referral.report_id or referral.id} collected by {request.user.full_name or request.user.username} ({method}).",
                actor=request.user,
                entity_type="Referral",
                entity_id=referral.id,
                patient_id=patient_id,
                patient_name=patient_name,
            )

            from accounts.notifications import notify_admins
            notify_admins(
                type="REPORT_COLLECTED",
                title="Report Collected",
                message=f"{patient_name or f'Patient #{patient_id}'}'s reviewed report has been collected.",
                related_entity_type="Referral",
                related_entity_id=referral.id,
                action_url="/admin/collections",
            )
        except Exception:
            pass

        return Response(
            ReferralSerializer(referral).data,
            status=status.HTTP_200_OK
        )



