import requests
# pyrefly: ignore [missing-import]
from django.conf import settings
# pyrefly: ignore [missing-import]
from rest_framework import generics
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated

from .models import Screening
from .serializers import ScreeningSerializer
from accounts.permissions import HasRole

# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework import status


class ScreeningListCreateView(generics.ListCreateAPIView):
    serializer_class = ScreeningSerializer
    permission_classes = [IsAuthenticated, HasRole]

    allowed_roles = ["HEALTH_WORKER"]

    def get_queryset(self):
        return Screening.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class ScreeningDetailView(generics.RetrieveAPIView):
    queryset = Screening.objects.all()
    serializer_class = ScreeningSerializer
    permission_classes = [IsAuthenticated, HasRole]

    allowed_roles = ["HEALTH_WORKER"]

class ScreeningImageUploadView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["HEALTH_WORKER"]

    def post(self, request, pk):
        try:
            screening = Screening.objects.get(pk=pk)
        except Screening.DoesNotExist:
            return Response(
                {"detail": "Screening not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if "fundus_image" not in request.FILES:
            return Response(
                {"detail": "fundus_image is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        screening.fundus_image = request.FILES["fundus_image"]
        screening.status = "IMAGE_UPLOADED"
        screening.save()

        return Response(
            ScreeningSerializer(screening).data,
            status=status.HTTP_200_OK
        )
class ScreeningAnalyzeView(APIView):
    permission_classes = [IsAuthenticated, HasRole]
    allowed_roles = ["HEALTH_WORKER"]

    def post(self, request, pk):
        try:
            screening = Screening.objects.get(pk=pk)
        except Screening.DoesNotExist:
            return Response(
                {"detail": "Screening not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if not screening.fundus_image:
            return Response(
                {"detail": "Please upload a fundus image before analysis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if screening.status == "COMPLETED":
            return Response(
                {"detail": "This screening has already been analyzed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        screening.status = "PROCESSING"
        screening.save()

        try:
            with screening.fundus_image.open("rb") as image_file:

                files = {
                    "file": (
                        screening.fundus_image.name,
                        image_file,
                        "image/jpeg"
                    )
                }

                ml_response = requests.post(
                    "http://127.0.0.1:8001/analyze",
                    files=files,
                    timeout=120
                )

            ml_response.raise_for_status()

            ml_result = ml_response.json()

            # Save ML analysis result
            screening.prediction = ml_result.get("prediction")
            screening.confidence = ml_result.get("confidence")
            screening.quality_data = ml_result.get("quality")
            screening.probabilities = ml_result.get("probabilities")
            screening.retinal_analysis = ml_result.get("retinal_analysis")
            screening.original_image_url = ml_result.get("original_image_url")
            screening.gradcam_url = ml_result.get("gradcam_url")
            screening.status = "COMPLETED"

            screening.save()

            return Response(
                {
                    "detail": "Image analyzed successfully.",
                    "screening_id": screening.id,
                    "status": screening.status,
                    "ml_result": ml_result,
                },
                status=status.HTTP_200_OK
            )

        except requests.exceptions.RequestException as e:

            screening.status = "IMAGE_UPLOADED"
            screening.save()

            return Response(
                {
                    "detail": "ML service error.",
                    "error": str(e)
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )