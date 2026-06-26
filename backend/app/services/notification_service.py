from datetime import datetime, timedelta, timezone

from bson.objectid import ObjectId

from config.database import database


def _to_utc_iso(value) -> str | None:
    """Serialize naive UTC datetimes as ISO strings with a Z suffix."""
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return value


def serialize_notification(doc: dict) -> dict:
    return {
        "id": str(doc.get("_id")),
        "user_id": doc.get("user_id"),
        "type": doc.get("type"),
        "title": doc.get("title"),
        "message": doc.get("message"),
        "metadata": doc.get("metadata") or {},
        "read": bool(doc.get("read", False)),
        "created_at": _to_utc_iso(doc.get("created_at")),
    }


def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    metadata: dict | None = None,
) -> dict:
    """Create an in-app notification for a user."""
    now = datetime.utcnow()
    doc = {
        "user_id": user_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "metadata": metadata or {},
        "read": False,
        "created_at": now,
    }
    result = database.get_collection("notifications").insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_notification(doc)


def notification_exists(
    user_id: str,
    notification_type: str,
    borrow_id: str | None = None,
) -> bool:
    """Check if a notification of this type was already sent (optionally per borrow)."""
    query: dict = {"user_id": user_id, "type": notification_type}
    if borrow_id:
        query["metadata.borrow_id"] = borrow_id
    return database.get_collection("notifications").find_one(query) is not None


def check_due_tomorrow_reminders(user_id: str) -> list[dict]:
    """Notify users when an active borrow is due tomorrow (once per borrow)."""
    now = datetime.utcnow()
    tomorrow = (now + timedelta(days=1)).date()

    borrows_collection = database.get_collection("borrows")
    active_borrows = borrows_collection.find(
        {
            "borrower_id": user_id,
            "status": "active",
            "due_date": {"$exists": True, "$ne": None},
        }
    )

    created = []
    for borrow in active_borrows:
        due_date = borrow.get("due_date")
        if not due_date:
            continue

        due_day = due_date.date() if hasattr(due_date, "date") else due_date
        if due_day != tomorrow:
            continue

        borrow_id = str(borrow.get("_id"))
        if notification_exists(user_id, "due_tomorrow", borrow_id):
            continue

        asset_name = borrow.get("assetName") or borrow.get("asset_name") or "borrowed item"
        due_str = due_date.strftime("%Y-%m-%d") if hasattr(due_date, "strftime") else str(due_day)
        notification = create_notification(
            user_id,
            "due_tomorrow",
            "Return Due Tomorrow",
            f"Reminder: '{asset_name}' must be returned by tomorrow ({due_str}). Please submit your return on time to protect your trust score.",
            {"borrow_id": borrow_id, "asset_name": asset_name, "due_date": due_str},
        )
        created.append(notification)

    return created


def sync_user_notifications(user_id: str) -> None:
    """Run scheduled notification checks (due-tomorrow reminders)."""
    check_due_tomorrow_reminders(user_id)


def get_notifications_for_user(user_id: str, limit: int = 50) -> list[dict]:
    collection = database.get_collection("notifications")
    docs = list(
        collection.find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    return [serialize_notification(d) for d in docs]


def get_unread_count(user_id: str) -> int:
    return database.get_collection("notifications").count_documents(
        {"user_id": user_id, "read": False}
    )


def mark_as_read(notification_id: str, user_id: str) -> bool:
    if not ObjectId.is_valid(notification_id):
        return False
    result = database.get_collection("notifications").update_one(
        {"_id": ObjectId(notification_id), "user_id": user_id},
        {"$set": {"read": True}},
    )
    return result.modified_count > 0


def mark_all_as_read(user_id: str) -> int:
    result = database.get_collection("notifications").update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}},
    )
    return result.modified_count
