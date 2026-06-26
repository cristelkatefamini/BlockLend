from datetime import datetime

from bson.objectid import ObjectId

from config.database import database
from services.notification_service import create_notification

CONDITION_TRUST_POINTS = {
    "good": 10,
    "fair": 5,
    "poor": -5,
    "damaged": -15,
}

ON_TIME_TRUST_POINTS = 5
LATE_TRUST_PENALTY_PER_DAY = 5
TRUST_WARNING_THRESHOLD = -25
MAX_WARNINGS = 3

DEFAULT_POINTS = {
    "trust_score": 0,
    "borrow_count": 0,
    "on_time_returns": 0,
    "late_returns": 0,
    "warning_count": 0,
}


def get_trust_points_for_condition(condition: str) -> int:
    return CONDITION_TRUST_POINTS.get((condition or "good").lower(), 0)


def calculate_timeliness_trust_delta(is_late: bool, days_late: int = 0) -> int:
    """On-time returns earn +5; late returns lose 5 points per day overdue."""
    if is_late:
        days = max(int(days_late or 0), 1)
        return -LATE_TRUST_PENALTY_PER_DAY * days
    return ON_TIME_TRUST_POINTS


def calculate_return_trust_delta(condition: str, is_late: bool, days_late: int = 0) -> int:
    """Combine condition and timeliness trust points for a completed return."""
    return get_trust_points_for_condition(condition) + calculate_timeliness_trust_delta(is_late, days_late)


def serialize_points(points_doc: dict | None) -> dict:
    if not points_doc:
        return dict(DEFAULT_POINTS)

    return {
        "trust_score": points_doc.get("trust_score", points_doc.get("credit_score", 0)),
        "borrow_count": points_doc.get("borrow_count", 0),
        "on_time_returns": points_doc.get("on_time_returns", 0),
        "late_returns": points_doc.get("late_returns", 0),
        "warning_count": min(int(points_doc.get("warning_count", 0)), MAX_WARNINGS),
    }


def ensure_points_document(user_id: str) -> dict:
    """Return the user's points document, creating one if missing."""
    points_collection = database.get_collection("points")
    existing = points_collection.find_one({"user_id": user_id})
    if existing:
        return existing

    now = datetime.utcnow()
    doc = {
        "user_id": user_id,
        **DEFAULT_POINTS,
        "created_at": now,
        "updated_at": now,
    }
    points_collection.insert_one(doc)
    return doc


def get_points_for_user(user_id: str) -> dict:
    user_id = str(user_id).strip()
    points_collection = database.get_collection("points")
    points_doc = points_collection.find_one({"user_id": user_id})
    if not points_doc and ObjectId.is_valid(user_id):
        points_doc = points_collection.find_one({"user_id": ObjectId(user_id)})
    return serialize_points(points_doc)


def is_user_banned(user_id: str) -> bool:
    users = database.get_collection("users")
    user_doc = users.find_one({"_id": ObjectId(user_id)}) if ObjectId.is_valid(user_id) else None
    if not user_doc or user_doc.get("is_active", True) is not False:
        return False
    points = get_points_for_user(user_id)
    return points.get("warning_count", 0) >= MAX_WARNINGS


def get_ban_message() -> str:
    return (
        "Your account has been banned after receiving 3 warnings. "
        "Please contact an administrator to request reactivation."
    )


def _record_trust_warning(user_id: str, warning_number: int, score_before: int) -> None:
    now = datetime.utcnow()
    database.get_collection("penalties").insert_one(
        {
            "user_id": user_id,
            "type": "trust_warning",
            "reason": (
                f"Trust score reached {TRUST_WARNING_THRESHOLD} (was {score_before}) "
                "and was reset to 0."
            ),
            "warning_number": warning_number,
            "trust_score_before": score_before,
            "created_at": now,
        }
    )


def _notify_trust_warning(user_id: str, warning_number: int) -> None:
    if warning_number == 1:
        create_notification(
            user_id,
            "warning",
            "Warning 1 of 3",
            (
                f"Your trust score reached {TRUST_WARNING_THRESHOLD} and was reset to 0. "
                "Improve your return habits to avoid further warnings."
            ),
            {"warning_number": warning_number, "max_warnings": MAX_WARNINGS},
        )
    elif warning_number == 2:
        create_notification(
            user_id,
            "warning",
            "Final Warning — Account Ban Pending",
            (
                "You now have 2 warnings. If your trust score reaches -25 again, "
                "your account will be permanently banned."
            ),
            {"warning_number": warning_number, "max_warnings": MAX_WARNINGS},
        )
    elif warning_number >= MAX_WARNINGS:
        create_notification(
            user_id,
            "account_ban",
            "Account Banned",
            get_ban_message(),
            {"warning_number": warning_number, "max_warnings": MAX_WARNINGS},
        )


def _ban_user_account(user_id: str) -> None:
    if not ObjectId.is_valid(user_id):
        return

    now = datetime.utcnow()
    database.get_collection("users").update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "is_active": False,
                "banned_at": now,
                "updated_at": now,
            }
        },
    )


def _process_trust_warnings(user_id: str, previous_warnings: int, warnings_added: int, score_before: int) -> None:
    if warnings_added <= 0:
        return

    for offset in range(1, warnings_added + 1):
        warning_number = min(previous_warnings + offset, MAX_WARNINGS)
        _record_trust_warning(user_id, warning_number, score_before)
        _notify_trust_warning(user_id, warning_number)

        if warning_number >= MAX_WARNINGS:
            _ban_user_account(user_id)
            break


def _apply_trust_score_change(user_id: str, trust_delta: int, is_late: bool) -> None:
    points_collection = database.get_collection("points")
    points_doc = points_collection.find_one({"user_id": user_id})
    current_score = int(points_doc.get("trust_score", 0))
    previous_warnings = int(points_doc.get("warning_count", 0))
    score_before_warning = current_score + trust_delta

    new_score = score_before_warning
    warnings_to_add = 0
    while new_score <= TRUST_WARNING_THRESHOLD:
        warnings_to_add += 1
        new_score = 0

    update_fields = {
        "trust_score": new_score,
        "updated_at": datetime.utcnow(),
    }
    update_inc = {"warning_count": warnings_to_add}
    if is_late:
        update_inc["late_returns"] = 1
    else:
        update_inc["on_time_returns"] = 1

    points_collection.update_one(
        {"user_id": user_id},
        {"$set": update_fields, "$inc": update_inc},
    )

    _process_trust_warnings(user_id, previous_warnings, warnings_to_add, score_before_warning)


def record_borrow_approved(user_id: str) -> None:
    ensure_points_document(user_id)
    database.get_collection("points").update_one(
        {"user_id": user_id},
        {
            "$inc": {"borrow_count": 1},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )


def record_return(user_id: str, condition: str, is_late: bool, days_late: int = 0) -> int:
    """Apply combined condition + timeliness trust points. Returns total delta."""
    ensure_points_document(user_id)
    trust_delta = calculate_return_trust_delta(condition, is_late, days_late)
    _apply_trust_score_change(user_id, trust_delta, is_late)
    return trust_delta


def delete_points_for_user(user_id: str) -> None:
    database.get_collection("points").delete_one({"user_id": user_id})


def reset_warnings_for_user(user_id: str) -> dict:
    """Reset a user's warning count to zero (admin action)."""
    ensure_points_document(user_id)
    now = datetime.utcnow()
    database.get_collection("points").update_one(
        {"user_id": user_id},
        {"$set": {"warning_count": 0, "updated_at": now}},
    )

    user_update: dict = {"updated_at": now, "is_active": True}
    unset_fields: dict = {}
    if ObjectId.is_valid(user_id):
        user_doc = database.get_collection("users").find_one({"_id": ObjectId(user_id)})
        if user_doc and user_doc.get("banned_at"):
            unset_fields["banned_at"] = ""
            update_doc: dict = {"$set": user_update}
            if unset_fields:
                update_doc["$unset"] = unset_fields
            database.get_collection("users").update_one(
                {"_id": ObjectId(user_id)},
                update_doc,
            )

    return get_points_for_user(user_id)
