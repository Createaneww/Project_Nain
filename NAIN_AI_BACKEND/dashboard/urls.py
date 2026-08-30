# pyrefly: ignore [missing-import]
from django.urls import path
from .views import (
    AdminDashboardView,
    DoctorDashboardView,
    HealthWorkerDashboardView,
    AnalyticsDashboardView,
)

urlpatterns = [
    path("admin/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("doctor/", DoctorDashboardView.as_view(), name="doctor-dashboard"),
    path(
        "health-worker/",
        HealthWorkerDashboardView.as_view(),
        name="health-worker-dashboard"
    ),
    path(
        "analytics/",
        AnalyticsDashboardView.as_view(),
        name="analytics-dashboard"
    ),
]
