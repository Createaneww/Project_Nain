# pyrefly: ignore [missing-import]
from django.db import models
from screenings.models import Screening


class Report(models.Model):
    screening = models.OneToOneField(
        Screening,
        on_delete=models.CASCADE,
        related_name="report"
    )

    prediction = models.CharField(
        max_length=100
    )

    confidence = models.FloatField()

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

    generated_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"Report #{self.id} - Screening #{self.screening.id}"