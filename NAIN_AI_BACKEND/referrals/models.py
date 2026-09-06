# pyrefly: ignore [missing-import]
from django.db import models


class Referral(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("ASSIGNED", "Assigned"),
        ("REVIEWED", "Reviewed"),
        ("COLLECTED", "Collected"),
    ]

    report = models.OneToOneField(
        "reports.Report",
        on_delete=models.CASCADE,
        related_name="referral"
    )

    assigned_doctor = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_referrals"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    doctor_notes = models.TextField(
        blank=True,
        default=""
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    collected_at = models.DateTimeField(
        null=True,
        blank=True
    )
    collected_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="collected_referrals"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def patient(self):
        try:
            return self.report.screening.patient
        except Exception:
            return None

    @property
    def priority(self):
        try:
            pred = (self.report.prediction or "").upper() if self.report else ""
            if "PROLIFERATIVE" in pred:
                return "URGENT"
            elif "SEVERE" in pred:
                return "HIGH"
            elif "MODERATE" in pred:
                return "MEDIUM"
            elif "MILD" in pred:
                return "LOW"
            return "NONE"
        except Exception:
            return "NONE"

    @property
    def available_for_claim(self):
        try:
            pred = (self.report.prediction or "").upper() if self.report else ""
            is_no_dr = any(term in pred for term in ["NO DR", "NORMAL", "NO_DR"]) or pred == "0"
            return self.assigned_doctor_id is None and self.status == "PENDING" and not is_no_dr
        except Exception:
            return False

    def __str__(self):
        try:
            return f"Referral #{self.id} - {self.report.screening.patient.full_name}"
        except Exception:
            return f"Referral #{self.id}"

