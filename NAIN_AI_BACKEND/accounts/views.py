from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .permissions import HasRole


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