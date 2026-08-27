from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import MeView, HealthWorkerTestView

from .views import MeView

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
    path(
    "test/health-worker/",
    HealthWorkerTestView.as_view(),
    name="health-worker-test",
),
]