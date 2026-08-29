# pyrefly: ignore [missing-import]
from django.urls import path
from .views import (
    ScreeningListCreateView,
    ScreeningDetailView,
    ScreeningImageUploadView,
    ScreeningAnalyzeView,
    ScreeningReportView,
)

urlpatterns = [
    path("", ScreeningListCreateView.as_view(), name="screening-list-create"),
    path("<int:pk>/upload/", ScreeningImageUploadView.as_view(), name="screening-image-upload"),
    path("<int:pk>/analyze/", ScreeningAnalyzeView.as_view(), name="screening-analyze"),
    path("<int:pk>/report/", ScreeningReportView.as_view(), name="screening-report"),
    path("<int:pk>/", ScreeningDetailView.as_view(), name="screening-detail"),
]