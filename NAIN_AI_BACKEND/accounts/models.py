# pyrefly: ignore [missing-import]
from django.contrib.auth.models import AbstractUser
# pyrefly: ignore [missing-import]
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

    @property
    def full_name(self):
        full = self.get_full_name()
        return full.strip() if full else self.username

    def __str__(self):
        return f"{self.username} - {self.role}"


class ActivityLog(models.Model):
    class Category(models.TextChoices):
        PATIENT = "PATIENT", "Patient"
        SCREENING = "SCREENING", "Screening"
        AI_ANALYSIS = "AI_ANALYSIS", "AI Analysis"
        REFERRAL = "REFERRAL", "Referral"
        CLINICAL_EVALUATION = "CLINICAL_EVALUATION", "Clinical Evaluation"
        COLLECTION = "COLLECTION", "Collection"
        USER_MANAGEMENT = "USER_MANAGEMENT", "User Management"
        AUTH = "AUTH", "Authentication"

    event_type = models.CharField(max_length=60, db_index=True)
    category = models.CharField(max_length=40, choices=Category.choices, db_index=True)
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_logs"
    )
    actor_name = models.CharField(max_length=150, blank=True, default="")
    actor_role = models.CharField(max_length=40, blank=True, default="")
    entity_type = models.CharField(max_length=50, blank=True, default="")
    entity_id = models.CharField(max_length=50, blank=True, default="")
    patient_id = models.IntegerField(null=True, blank=True, db_index=True)
    patient_name = models.CharField(max_length=150, blank=True, default="")
    details = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Activity Log"
        verbose_name_plural = "Activity Logs"

    def __str__(self):
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {self.actor_name} ({self.actor_role}): {self.event_type} - {self.details[:40]}"


class Notification(models.Model):
    class Type(models.TextChoices):
        REFERRAL_PENDING = "REFERRAL_PENDING", "New Referral Pending"
        CASE_ASSIGNED = "CASE_ASSIGNED", "New Case Assigned"
        CLINICAL_REVIEW_COMPLETED = "CLINICAL_REVIEW_COMPLETED", "Clinical Review Completed"
        REPORT_READY_FOR_COLLECTION = "REPORT_READY_FOR_COLLECTION", "Report Ready for Collection"
        REPORT_COLLECTED = "REPORT_COLLECTED", "Report Collected"
        SYSTEM = "SYSTEM", "System Notification"

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True
    )
    type = models.CharField(max_length=60, choices=Type.choices, default=Type.SYSTEM, db_index=True)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    related_entity_type = models.CharField(max_length=50, blank=True, default="")
    related_entity_id = models.CharField(max_length=50, blank=True, default="")
    action_url = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        return f"[{self.type}] to {self.recipient.username}: {self.title} (Read: {self.is_read})"


