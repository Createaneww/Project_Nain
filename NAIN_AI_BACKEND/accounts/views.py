# pyrefly: ignore [missing-import]
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
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


class AdminUserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by("id")
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["ADMIN"]


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["ADMIN"]
    http_method_names = ["get", "patch", "head", "options"]