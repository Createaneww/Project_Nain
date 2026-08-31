import logging
from typing import Optional, Dict, Any
from .models import ActivityLog, User

logger = logging.getLogger(__name__)


def log_activity(
    event_type: str,
    category: str,
    details: str,
    actor: Optional[User] = None,
    actor_name: Optional[str] = None,
    actor_role: Optional[str] = None,
    entity_type: str = "",
    entity_id: Any = "",
    patient_id: Optional[int] = None,
    patient_name: str = "",
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[ActivityLog]:
    """
    Safely creates and persists an ActivityLog entry in the database.
    Does not raise exceptions if logging encounters an unexpected error to avoid interrupting core workflows.
    """
    try:
        # Determine actor info
        name = actor_name or ""
        role = actor_role or ""

        if actor and getattr(actor, "is_authenticated", False):
            if not name:
                name = getattr(actor, "full_name", "") or getattr(actor, "username", "")
            if not role:
                role = getattr(actor, "role", "")

        # Sanitize metadata (remove sensitive items like passwords, tokens)
        sanitized_meta = {}
        if metadata and isinstance(metadata, dict):
            for k, v in metadata.items():
                if k.lower() in ("password", "token", "access", "refresh", "secret", "authorization"):
                    continue
                sanitized_meta[k] = v

        log_entry = ActivityLog.objects.create(
            event_type=event_type,
            category=category,
            actor=actor if (actor and getattr(actor, "is_authenticated", False) and isinstance(actor, User)) else None,
            actor_name=name or "System",
            actor_role=role or "SYSTEM",
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else "",
            patient_id=patient_id,
            patient_name=patient_name or "",
            details=details,
            metadata=sanitized_meta,
        )
        return log_entry
    except Exception as e:
        logger.warning(f"Failed to record activity log: {e}")
        return None
