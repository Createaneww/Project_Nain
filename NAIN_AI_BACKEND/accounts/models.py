from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    class Role(models.TextChoices):
        HEALTH_WORKER = "HEALTH_WORKER", "Health Worker"
        DOCTOR = "DOCTOR", "Doctor"
        ADMIN = "ADMIN", "Admin"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.HEALTH_WORKER
    )

    def __str__(self):
        return f"{self.username} - {self.role}"