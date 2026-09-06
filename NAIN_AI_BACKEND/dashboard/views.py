# pyrefly: ignore [missing-import]
from django.db.models import Count, Q
# pyrefly: ignore [missing-import]
from django.utils import timezone
# pyrefly: ignore [missing-import]
from rest_framework import status
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import HasRole
from patients.models import Patient
from referrals.models import Referral
from reports.models import Report
from screenings.models import Screening


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["ADMIN"]

    def get(self, request):
        data = {
            "users": {
                "total": User.objects.count(),
                "admins": User.objects.filter(role=User.Role.ADMIN).count(),
                "doctors": User.objects.filter(role=User.Role.DOCTOR).count(),
                "health_workers": User.objects.filter(role=User.Role.HEALTH_WORKER).count(),
            },
            "patients": {
                "total": Patient.objects.count(),
            },
            "screenings": {
                "total": Screening.objects.count(),
            },
            "reports": {
                "total": Report.objects.count(),
            },
            "referrals": {
                "total": Referral.objects.count(),
                "pending": Referral.objects.filter(status="PENDING").count(),
                "assigned": Referral.objects.filter(status="ASSIGNED").count(),
                "reviewed": Referral.objects.filter(status="REVIEWED").count(),
                "collected": Referral.objects.filter(status="COLLECTED").count(),
            },
        }
        return Response(data, status=status.HTTP_200_OK)


class DoctorDashboardView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["DOCTOR"]

    def get(self, request):
        doctor = request.user
        NO_DR_Q = (
            Q(report__prediction__icontains="no dr")
            | Q(report__prediction__icontains="normal")
            | Q(report__prediction__isnull=True)
            | Q(report__prediction="")
        )
        doctor_referrals = Referral.objects.filter(
            assigned_doctor=doctor
        ).exclude(NO_DR_Q)

        today = timezone.localdate()

        assigned_active = doctor_referrals.filter(status="ASSIGNED")
        pending_count = assigned_active.count()
        reviewed_count = doctor_referrals.filter(status="REVIEWED").count()
        collected_count = doctor_referrals.filter(status="COLLECTED").count()
        reviewed_today = doctor_referrals.filter(
            status__in=["REVIEWED", "COLLECTED"],
            reviewed_at__date=today
        ).count()
        urgent_count = assigned_active.filter(
            Q(report__prediction__icontains="severe") | Q(report__prediction__icontains="proliferative")
        ).count()

        available_referrals = Referral.objects.filter(
            assigned_doctor__isnull=True,
            status="PENDING",
        ).exclude(NO_DR_Q)
        available_count = available_referrals.count()

        data = {
            "doctor": {
                "id": doctor.id,
                "username": doctor.username,
                "full_name": doctor.full_name,
            },
            "referrals": {
                "total_assigned": doctor_referrals.count(),
                "assigned": pending_count,
                "pending_reviews": pending_count,
                "available": available_count,
                "unassigned": available_count,
                "reviewed": reviewed_count,
                "collected": collected_count,
                "reviewed_today": reviewed_today,
                "urgent": urgent_count,
            },
        }
        return Response(data, status=status.HTTP_200_OK)


class HealthWorkerDashboardView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["HEALTH_WORKER"]

    def get(self, request):
        user = request.user
        user_screenings = Screening.objects.filter(created_by=user)
        today = timezone.localdate()

        data = {
            "health_worker": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
            },
            "screenings": {
                "total": user_screenings.count(),
                "today": user_screenings.filter(created_at__date=today).count(),
            },
            "referrals_collected": {
                "total": Referral.objects.filter(collected_by=user).count(),
            },
        }
        return Response(data, status=status.HTTP_200_OK)


class AnalyticsDashboardView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["ADMIN"]

    def get(self, request):
        # 1. Overview counts
        overview_data = {
            "total_patients": Patient.objects.count(),
            "total_screenings": Screening.objects.count(),
            "total_reports": Report.objects.count(),
            "total_referrals": Referral.objects.count(),
        }

        # 2. Prediction analytics
        prediction_counts = Report.objects.aggregate(
            no_dr=Count(
                "id",
                filter=Q(prediction__icontains="no dr") | Q(prediction__icontains="normal")
            ),
            mild=Count("id", filter=Q(prediction__icontains="mild")),
            moderate=Count("id", filter=Q(prediction__icontains="moderate")),
            severe=Count("id", filter=Q(prediction__icontains="severe")),
            proliferative=Count("id", filter=Q(prediction__icontains="proliferative")),
        )

        # 3. Referral status counts
        referral_counts = Referral.objects.aggregate(
            pending=Count("id", filter=Q(status="PENDING")),
            assigned=Count("id", filter=Q(status="ASSIGNED")),
            reviewed=Count("id", filter=Q(status="REVIEWED")),
            collected=Count("id", filter=Q(status="COLLECTED")),
        )

        # 4. Doctor workload
        doctors = User.objects.filter(role=User.Role.DOCTOR).annotate(
            total_assigned_count=Count("assigned_referrals", distinct=True),
            assigned_count=Count(
                "assigned_referrals",
                filter=Q(assigned_referrals__status="ASSIGNED"),
                distinct=True
            ),
            reviewed_count=Count(
                "assigned_referrals",
                filter=Q(assigned_referrals__status="REVIEWED"),
                distinct=True
            ),
            collected_count=Count(
                "assigned_referrals",
                filter=Q(assigned_referrals__status="COLLECTED"),
                distinct=True
            ),
        ).order_by("id")

        doctor_workload = [
            {
                "doctor_id": doc.id,
                "username": doc.username,
                "full_name": doc.full_name,
                "total_assigned": doc.total_assigned_count,
                "assigned": doc.assigned_count,
                "reviewed": doc.reviewed_count,
                "collected": doc.collected_count,
            }
            for doc in doctors
        ]

        # 5. Health worker activity
        health_workers = User.objects.filter(role=User.Role.HEALTH_WORKER).annotate(
            screenings_count=Count("screenings_created", distinct=True),
            referrals_collected_count=Count("collected_referrals", distinct=True),
        ).order_by("id")

        health_worker_activity = [
            {
                "health_worker_id": hw.id,
                "username": hw.username,
                "full_name": hw.full_name,
                "screenings_created": hw.screenings_count,
                "referrals_collected": hw.referrals_collected_count,
            }
            for hw in health_workers
        ]

        data = {
            "overview": overview_data,
            "predictions": {
                "no_dr": prediction_counts["no_dr"],
                "mild": prediction_counts["mild"],
                "moderate": prediction_counts["moderate"],
                "severe": prediction_counts["severe"],
                "proliferative": prediction_counts["proliferative"],
            },
            "referrals": {
                "pending": referral_counts["pending"],
                "assigned": referral_counts["assigned"],
                "reviewed": referral_counts["reviewed"],
                "collected": referral_counts["collected"],
            },
            "doctor_workload": doctor_workload,
            "health_worker_activity": health_worker_activity,
        }

        return Response(data, status=status.HTTP_200_OK)


