# pyrefly: ignore [missing-import]
from django.db import transaction
from django.db.models import Case, When, Value, IntegerField, Q
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
        user = self.request.user

        NO_DR_Q = (
            Q(report__prediction__icontains="no dr")
            | Q(report__prediction__icontains="normal")
            | Q(report__prediction__isnull=True)
            | Q(report__prediction="")
        )

        priority_order = Case(
            When(report__prediction__icontains="proliferative", then=Value(1)),
            When(report__prediction__icontains="severe", then=Value(2)),
            When(report__prediction__icontains="moderate", then=Value(3)),
            When(report__prediction__icontains="mild", then=Value(4)),
            default=Value(5),
            output_field=IntegerField(),
        )

        queryset = Referral.objects.select_related(
            "report",
            "report__screening",
            "report__screening__patient",
            "assigned_doctor",
            "collected_by",
        ).annotate(priority_rank=priority_order)

        status_param = self.request.query_params.get("status")
        doctor_id = self.request.query_params.get("doctor_id")
        patient_id = self.request.query_params.get("patient_id")
        scope = (self.request.query_params.get("scope") or "").strip().lower()

        if user.role == User.Role.DOCTOR:
            # Doctor workflow:
            # 1. Base query: cases assigned to this doctor OR unassigned pending cases available to claim.
            # 2. Never show cases assigned to OTHER doctors.
            # 3. Never show No DR cases.
            queryset = queryset.filter(
                Q(assigned_doctor=user) | Q(assigned_doctor__isnull=True, status="PENDING")
            ).exclude(NO_DR_Q)

            if scope in ["available", "unassigned"] or (status_param and status_param.strip().upper() in ["AVAILABLE", "UNASSIGNED"]):
                # Exclusively unassigned eligible cases available for claim
                queryset = queryset.filter(assigned_doctor__isnull=True, status="PENDING")
            elif scope in ["my_cases", "assigned", "my_assigned"] or (status_param and status_param.strip().upper() == "MY_CASES"):
                # Exclusively cases assigned to currently logged-in doctor
                queryset = queryset.filter(assigned_doctor=user)
                if status_param and status_param.strip().upper() in ["REVIEWED", "COLLECTED"]:
                    queryset = queryset.filter(status__in=["REVIEWED", "COLLECTED"])
                elif status_param and status_param.strip().upper() == "ASSIGNED":
                    queryset = queryset.filter(status="ASSIGNED")
            elif status_param:
                sp = status_param.strip().upper()
                if sp == "ASSIGNED":
                    queryset = queryset.filter(assigned_doctor=user, status="ASSIGNED")
                elif sp in ["PENDING_REVIEW", "PENDING"]:
                    # Includes assigned to me pending review + unassigned pending available to claim
                    queryset = queryset.filter(
                        Q(assigned_doctor=user, status="ASSIGNED") | Q(assigned_doctor__isnull=True, status="PENDING")
                    )
                elif sp == "REVIEWED":
                    queryset = queryset.filter(assigned_doctor=user, status__in=["REVIEWED", "COLLECTED"])
                elif sp == "ALL":
                    pass
                else:
                    queryset = queryset.filter(status__iexact=status_param.strip())
            else:
                # Default for doctor queue: active actionable cases (my assigned + available unassigned)
                queryset = queryset.filter(
                    Q(assigned_doctor=user, status="ASSIGNED") | Q(assigned_doctor__isnull=True, status="PENDING")
                )

            # Sort order:
            # 1. Proliferative / URGENT (rank 1)
            # 2. Severe / HIGH (rank 2)
            # 3. Moderate / MEDIUM (rank 3)
            # 4. Mild / LOW (rank 4)
            # 5. Oldest referral first (created_at ascending)
            return queryset.order_by("priority_rank", "created_at")

        else:
            # Admin & Health Worker
            if status_param and status_param.upper() != "ALL":
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

            sort_by_priority = self.request.query_params.get("sort_by_priority", "false").lower() == "true"
            if sort_by_priority:
                return queryset.order_by("priority_rank", "created_at")
            return queryset.order_by("-created_at")


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
        with transaction.atomic():
            try:
                referral = Referral.objects.select_for_update().select_related(
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

            pred = (referral.report.prediction or "").upper() if referral.report else ""
            if any(term in pred for term in ["NO DR", "NORMAL", "NO_DR"]) or pred == "0":
                return Response(
                    {"detail": "Cases with 'No DR' do not require doctor assignment or clinical review."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            is_doctor_self_claim = request.user.role == User.Role.DOCTOR

            if is_doctor_self_claim:
                # Concurrency check: Ensure case is not already assigned to another doctor
                if referral.assigned_doctor_id is not None:
                    if referral.assigned_doctor_id == request.user.id:
                        serializer = ReferralSerializer(referral)
                        return Response(serializer.data, status=status.HTTP_200_OK)
                    assigned_doc_name = (
                        referral.assigned_doctor.full_name or referral.assigned_doctor.username
                    )
                    return Response(
                        {
                            "detail": f"This referral has already been claimed by Dr. {assigned_doc_name}.",
                            "claimed": True,
                            "assigned_doctor_id": referral.assigned_doctor_id,
                        },
                        status=status.HTTP_409_CONFLICT
                    )

                referral.assigned_doctor = request.user
                referral.status = "ASSIGNED"
                referral.save()
                assigned_target_doctor = request.user
                was_already_assigned = False
            else:
                # Admin or Health Worker manually assigning
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
                assigned_target_doctor = doctor

        # Outside atomic transaction: logs and notifications
        try:
            from accounts.activity import log_activity
            patient = getattr(referral, "patient", None)
            patient_name = patient.full_name if patient else ""
            patient_id = patient.id if patient else None

            if is_doctor_self_claim:
                log_activity(
                    event_type="DOCTOR_CLAIMED_CASE",
                    category="REFERRAL",
                    details=f"Dr. {request.user.full_name or request.user.username} claimed Referral #{referral.id}.",
                    actor=request.user,
                    entity_type="Referral",
                    entity_id=referral.id,
                    patient_id=patient_id,
                    patient_name=patient_name,
                )
                from accounts.notifications import create_notification
                admins = User.objects.filter(role=User.Role.ADMIN, is_active=True)
                for admin in admins:
                    create_notification(
                        recipient=admin,
                        type="CASE_CLAIMED",
                        title="Case Claimed by Doctor",
                        message=f"Dr. {request.user.full_name or request.user.username} claimed Referral #{referral.id} for {patient_name}.",
                        related_entity_type="Referral",
                        related_entity_id=referral.id,
                        action_url=f"/admin/referrals/{referral.id}",
                    )
            else:
                log_activity(
                    event_type="DOCTOR_REASSIGNED" if was_already_assigned else "DOCTOR_ASSIGNED",
                    category="REFERRAL",
                    details=f"Referral #{referral.id} {'reassigned' if was_already_assigned else 'assigned'} to Dr. {assigned_target_doctor.full_name or assigned_target_doctor.username}.",
                    actor=request.user,
                    entity_type="Referral",
                    entity_id=referral.id,
                    patient_id=patient_id,
                    patient_name=patient_name,
                )
                from accounts.notifications import create_notification
                create_notification(
                    recipient=assigned_target_doctor,
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


class ReferralClaimView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["DOCTOR"]

    def post(self, request, pk):
        with transaction.atomic():
            try:
                referral = Referral.objects.select_for_update().select_related(
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

            pred = (referral.report.prediction or "").upper() if referral.report else ""
            if any(term in pred for term in ["NO DR", "NORMAL", "NO_DR"]) or pred == "0":
                return Response(
                    {"detail": "Cases with 'No DR' do not require doctor clinical review."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if case was already claimed or assigned to another doctor
            if referral.assigned_doctor_id is not None:
                if referral.assigned_doctor_id == request.user.id:
                    # Already claimed by this doctor
                    serializer = ReferralSerializer(referral)
                    return Response(serializer.data, status=status.HTTP_200_OK)
                else:
                    assigned_doc_name = referral.assigned_doctor.full_name or referral.assigned_doctor.username
                    return Response(
                        {
                            "detail": f"This referral has already been claimed by Dr. {assigned_doc_name}.",
                            "claimed": True,
                            "assigned_doctor_id": referral.assigned_doctor_id,
                        },
                        status=status.HTTP_409_CONFLICT
                    )

            if referral.status not in ["PENDING", "ASSIGNED"]:
                return Response(
                    {"detail": f"This case is already finalized ({referral.status})."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Claim case
            referral.assigned_doctor = request.user
            referral.status = "ASSIGNED"
            referral.save()

        # Outside atomic block: logs & notifications
        try:
            from accounts.activity import log_activity
            patient = getattr(referral, "patient", None)
            patient_name = patient.full_name if patient else ""
            patient_id = patient.id if patient else None

            log_activity(
                event_type="DOCTOR_CLAIMED_CASE",
                category="REFERRAL",
                details=f"Dr. {request.user.full_name or request.user.username} claimed Referral #{referral.id}.",
                actor=request.user,
                entity_type="Referral",
                entity_id=referral.id,
                patient_id=patient_id,
                patient_name=patient_name,
            )

            from accounts.notifications import create_notification
            admins = User.objects.filter(role=User.Role.ADMIN, is_active=True)
            for admin in admins:
                create_notification(
                    recipient=admin,
                    type="CASE_CLAIMED",
                    title="Case Claimed by Doctor",
                    message=f"Dr. {request.user.full_name or request.user.username} claimed Referral #{referral.id} for {patient_name}.",
                    related_entity_type="Referral",
                    related_entity_id=referral.id,
                    action_url=f"/admin/referrals/{referral.id}",
                )
        except Exception:
            pass

        serializer = ReferralSerializer(referral)
        return Response(serializer.data, status=status.HTTP_200_OK)


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



