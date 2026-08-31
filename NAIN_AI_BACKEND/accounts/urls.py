from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import MeView, HealthWorkerTestView, DoctorListView

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
    path("doctors/", DoctorListView.as_view(), name="doctor-list"),
    path(
        "test/health-worker/",
        HealthWorkerTestView.as_view(),
        name="health-worker-test",
    ),
]