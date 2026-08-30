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

    allowed_roles = ["ADMIN"]

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

    allowed_roles = ["ADMIN"]

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
    allowed_roles = ["ADMIN"]

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

        referral.assigned_doctor = doctor
        referral.status = "ASSIGNED"
        referral.save()

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

        return Response(
            ReferralSerializer(referral).data,
            status=status.HTTP_200_OK
        )


