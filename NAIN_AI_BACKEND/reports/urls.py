# pyrefly: ignore [missing-import]
from django.urls import path
from .views import ReportListView, ReportDetailView, ReportPrintView

urlpatterns = [
    path("", ReportListView.as_view(), name="report-list"),
    path("<int:pk>/", ReportDetailView.as_view(), name="report-detail"),
    path("<int:pk>/print/", ReportPrintView.as_view(), name="report-print"),
]