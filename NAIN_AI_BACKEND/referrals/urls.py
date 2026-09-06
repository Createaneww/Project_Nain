# pyrefly: ignore [missing-import]
from django.urls import path

from .views import (
    ReferralListView,
    ReferralDetailView,
    ReferralAssignDoctorView,
    ReferralClaimView,
    ReferralReviewView,
    ReferralCollectView,
)


urlpatterns = [
    path("", ReferralListView.as_view(), name="referral-list"),
    path("<int:pk>/", ReferralDetailView.as_view(), name="referral-detail"),
    path("<int:pk>/assign-doctor/", ReferralAssignDoctorView.as_view(), name="referral-assign-doctor"),
    path("<int:pk>/claim/", ReferralClaimView.as_view(), name="referral-claim"),
    path("<int:pk>/review/", ReferralReviewView.as_view(), name="referral-review"),
    path("<int:pk>/collect/", ReferralCollectView.as_view(), name="referral-collect"),
]

