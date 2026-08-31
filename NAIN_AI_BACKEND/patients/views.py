# pyrefly: ignore [missing-import]
from django.db.models import Q
# pyrefly: ignore [missing-import]
from rest_framework import generics
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasRole
from .models import Patient
from .serializers import PatientSerializer


class PatientListCreateView(generics.ListCreateAPIView):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["HEALTH_WORKER", "ADMIN"]

    def get_queryset(self):
        queryset = Patient.objects.all().order_by("-created_at")
        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(email__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        patient = serializer.save(created_by=self.request.user)
        from accounts.activity import log_activity
        log_activity(
            event_type="PATIENT_CREATED",
            category="PATIENT",
            details=f"Patient {patient.full_name} registered successfully.",
            actor=self.request.user,
            entity_type="Patient",
            entity_id=patient.id,
            patient_id=patient.id,
            patient_name=patient.full_name,
        )


class PatientDetailView(generics.RetrieveUpdateAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["HEALTH_WORKER", "ADMIN"]
    http_method_names = ["get", "patch", "head", "options"]

    def perform_update(self, serializer):
        patient = serializer.save()
        from accounts.activity import log_activity
        log_activity(
            event_type="PATIENT_UPDATED",
            category="PATIENT",
            details=f"Patient {patient.full_name} profile updated.",
            actor=self.request.user,
            entity_type="Patient",
            entity_id=patient.id,
            patient_id=patient.id,
            patient_name=patient.full_name,
        )
