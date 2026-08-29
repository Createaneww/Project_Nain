# pyrefly: ignore [missing-import]
from django.db import models
from patients.models import Patient


class Screening(models.Model):
    STATUS_CHOICES = [
        ("CREATED", "Created"),
        ("IMAGE_UPLOADED", "Image Uploaded"),
        ("PROCESSING", "Processing"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    ]

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="screenings"
    )

    fundus_image = models.ImageField(
        upload_to="fundus_images/",
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="CREATED"
    )

    prediction = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    confidence = models.FloatField(
        null=True,
        blank=True
    )

    quality_data = models.JSONField(
        null=True,
        blank=True
    )

    probabilities = models.JSONField(
        null=True,
        blank=True
    )

    retinal_analysis = models.JSONField(
        null=True,
        blank=True
    )

    original_image_url = models.CharField(
        max_length=500,
        null=True,
        blank=True
    )

    gradcam_url = models.CharField(
        max_length=500,
        null=True,
        blank=True
    )

    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="screenings_created"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Screening #{self.id} - {self.patient.full_name}"