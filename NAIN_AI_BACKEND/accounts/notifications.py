import logging
from typing import Optional, List, Any
from .models import Notification, User

logger = logging.getLogger(__name__)


def create_notification(
    recipient: User,
    type: str,
    title: str,
    message: str,
    related_entity_type: str = "",
    related_entity_id: Any = "",
    action_url: str = "",
) -> Optional[Notification]:
    """
    Safely creates a persistent Notification record in the database for the given recipient.
    """
    try:
        if not recipient or not isinstance(recipient, User):
            logger.warning(f"Notification creation skipped: Invalid recipient ({recipient})")
            return None

        notification = Notification.objects.create(
            recipient=recipient,
            type=type,
            title=title,
            message=message,
            related_entity_type=related_entity_type,
            related_entity_id=str(related_entity_id) if related_entity_id is not None else "",
            action_url=action_url,
        )
        return notification
    except Exception as e:
        logger.warning(f"Failed to create notification for user {getattr(recipient, 'id', 'unknown')}: {e}")
        return None


def notify_admins(
    type: str,
    title: str,
    message: str,
    related_entity_type: str = "",
    related_entity_id: Any = "",
    action_url: str = "",
) -> List[Notification]:
    """
    Broadcasts a persistent Notification to all active Administrator users.
    """
    created_notifications = []
    try:
        admins = User.objects.filter(role=User.Role.ADMIN, is_active=True)
        for admin in admins:
            notif = create_notification(
                recipient=admin,
                type=type,
                title=title,
                message=message,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
                action_url=action_url,
            )
            if notif:
                created_notifications.append(notif)
    except Exception as e:
        logger.warning(f"Failed to broadcast notification to admins: {e}")
    return created_notifications
