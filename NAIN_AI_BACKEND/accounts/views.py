# pyrefly: ignore [missing-import]
from rest_framework import generics
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
from .models import User
from .permissions import HasRole
from .serializers import AdminUserSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
        })


class HealthWorkerTestView(APIView):
    permission_classes = [HasRole]
    allowed_roles = ["HEALTH_WORKER"]

    def get(self, request):
        return Response({
            "message": "Health Worker access granted.",
            "role": request.user.role,
        })


# pyrefly: ignore [missing-import]
from django.db.models import Q


class AdminUserListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["ADMIN"]

    def get_queryset(self):
        queryset = User.objects.all().order_by("id")
        role = self.request.query_params.get("role")
        search = self.request.query_params.get("search")
        if role and role.upper() != "ALL":
            queryset = queryset.filter(role=role.upper())
        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        user = serializer.save()
        from .activity import log_activity
        log_activity(
            event_type="USER_CREATED",
            category="USER_MANAGEMENT",
            details=f"New {user.role} user @{user.username} ({user.full_name or user.username}) registered.",
            actor=self.request.user,
            entity_type="User",
            entity_id=user.id,
        )


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["ADMIN"]
    http_method_names = ["get", "patch", "head", "options"]

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        new_is_active = request.data.get("is_active")

        if new_is_active is False or new_is_active == "false":
            if request.user.id == instance.id:
                return Response(
                    {"detail": "You cannot deactivate your own logged-in Administrator account."},
                    status=400
                )
            if instance.role == User.Role.ADMIN:
                active_admins_count = User.objects.filter(role=User.Role.ADMIN, is_active=True).count()
                if active_admins_count <= 1:
                    return Response(
                        {"detail": "Cannot deactivate the last active Administrator account."},
                        status=400
                    )

        has_password = bool(request.data.get("password"))
        old_active = instance.is_active

        response = super().patch(request, *args, **kwargs)

        if response.status_code in (200, 201):
            from .activity import log_activity
            if has_password:
                log_activity(
                    event_type="PASSWORD_RESET",
                    category="USER_MANAGEMENT",
                    details=f"Password reset for user @{instance.username}.",
                    actor=request.user,
                    entity_type="User",
                    entity_id=instance.id,
                )
            elif new_is_active is not None and new_is_active != old_active:
                event = "USER_ACTIVATED" if new_is_active else "USER_DEACTIVATED"
                status_str = "activated" if new_is_active else "deactivated"
                log_activity(
                    event_type=event,
                    category="USER_MANAGEMENT",
                    details=f"User @{instance.username} account {status_str}.",
                    actor=request.user,
                    entity_type="User",
                    entity_id=instance.id,
                )
            else:
                log_activity(
                    event_type="USER_UPDATED",
                    category="USER_MANAGEMENT",
                    details=f"User @{instance.username} profile details updated.",
                    actor=request.user,
                    entity_type="User",
                    entity_id=instance.id,
                )

        return response



class DoctorListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        doctors = User.objects.filter(role=User.Role.DOCTOR, is_active=True).values(
            "id", "username", "first_name", "last_name", "email"
        )
        doctor_list = [
            {
                "id": doc["id"],
                "username": doc["username"],
                "full_name": f"{doc['first_name']} {doc['last_name']}".strip() or doc["username"],
                "email": doc["email"],
            }
            for doc in doctors
        ]
        return Response(doctor_list)


# pyrefly: ignore [missing-import]
from django.utils import timezone
from datetime import timedelta
from .models import ActivityLog
from .serializers import ActivityLogSerializer


class ActivityLogListView(generics.ListAPIView):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["ADMIN"]

    def get_queryset(self):
        queryset = ActivityLog.objects.all().order_by("-created_at")

        category = self.request.query_params.get("category")
        if category and category.upper() != "ALL":
            queryset = queryset.filter(category=category.upper())

        role = self.request.query_params.get("role")
        if role and role.upper() != "ALL":
            queryset = queryset.filter(actor_role=role.upper())

        date_range = self.request.query_params.get("date_range")
        now = timezone.now()
        if date_range == "TODAY":
            start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(created_at__gte=start_of_day)
        elif date_range in ("7_DAYS", "7DAYS"):
            queryset = queryset.filter(created_at__gte=now - timedelta(days=7))
        elif date_range in ("30_DAYS", "30DAYS"):
            queryset = queryset.filter(created_at__gte=now - timedelta(days=30))

        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(actor_name__icontains=search)
                | Q(patient_name__icontains=search)
                | Q(details__icontains=search)
                | Q(event_type__icontains=search)
                | Q(entity_id__icontains=search)
                | Q(patient_id__icontains=search)
            )

        return queryset


class ActivityLogDetailView(generics.RetrieveAPIView):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["ADMIN"]


from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(recipient=self.request.user).order_by("-created_at")
        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            if is_read.lower() == "true":
                queryset = queryset.filter(is_read=True)
            elif is_read.lower() == "false":
                queryset = queryset.filter(is_read=False)
        return queryset


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        return Response({"unread_count": count})


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response(
                {"detail": "Notification not found."},
                status=404
            )

        if not notif.is_read:
            notif.is_read = True
            notif.read_at = timezone.now()
            notif.save(update_fields=["is_read", "read_at"])

        return Response(NotificationSerializer(notif).data)


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        now = timezone.now()
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True, read_at=now)

        return Response({"updated_count": updated_count, "message": "All notifications marked as read."})


