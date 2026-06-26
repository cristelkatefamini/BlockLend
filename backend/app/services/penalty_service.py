from config.database import database


MAX_WARNINGS = 3


def get_penalties_for_user(user_id: str) -> list[dict]:
    docs = list(
        database.get_collection("penalties")
        .find({"user_id": user_id})
        .sort("created_at", -1)
    )
    return [
        {
            "id": str(d.get("_id")),
            "user_id": d.get("user_id"),
            "borrow_id": d.get("borrow_id"),
            "type": d.get("type"),
            "reason": d.get("reason"),
            "days_overdue": d.get("days_overdue", 0),
            "warning_number": d.get("warning_number"),
            "created_at": d.get("created_at"),
        }
        for d in docs
    ]
