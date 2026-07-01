from datetime import datetime
from bson.objectid import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from config.database import database
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/messages", tags=["messages"])


def serialize_message(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


def serialize_conversation(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


# ── helpers ──────────────────────────────────────────────────────────────────

def get_or_create_conversation(user_id: str) -> dict:
    """Return the single conversation thread for a user (create if missing)."""
    convs = database.get_collection("conversations")
    conv = convs.find_one({"user_id": user_id})
    if not conv:
        now = datetime.utcnow()
        result = convs.insert_one({
            "user_id": user_id,
            "created_at": now,
            "updated_at": now,
            "last_message": None,
            "unread_by_admin": 0,
            "unread_by_user": 0,
            "hidden_for_admin": False,
            "hidden_for_user": False,
        })
        conv = convs.find_one({"_id": result.inserted_id})
    return conv


# ── user endpoints ────────────────────────────────────────────────────────────

@router.get("/my")
async def get_my_messages(current_user: dict = Depends(get_current_user)):
    """Get the current user's conversation with admins."""
    user_id = current_user["user_id"]
    conv = get_or_create_conversation(user_id)
    conv_id = str(conv["_id"])

    msgs = database.get_collection("messages")

    # Only return messages created after the user hid the conversation
    query: dict = {"conversation_id": conv_id}
    hidden_at = conv.get("hidden_for_user_at")
    if hidden_at:
        query["created_at"] = {"$gt": hidden_at}

    messages = list(msgs.find(query).sort("created_at", 1))

    # Mark all admin→user messages as read
    msgs.update_many(
        {"conversation_id": conv_id, "sender_role": "admin", "read": False},
        {"$set": {"read": True}},
    )
    convs = database.get_collection("conversations")
    convs.update_one({"_id": conv["_id"]}, {"$set": {"unread_by_user": 0}})

    users = database.get_collection("users")
    user_doc = users.find_one({"_id": ObjectId(user_id)})
    username = user_doc.get("username", "User") if user_doc else "User"

    return {
        "conversation_id": conv_id,
        "username": username,
        "messages": [serialize_message(m) for m in messages],
        "unread_by_user": 0,
    }


@router.post("/send")
async def send_message(request: Request, current_user: dict = Depends(get_current_user)):
    """Send a message (user → admins or admin → user)."""
    body = await request.json()
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message text is required")

    sender_id = current_user["user_id"]
    sender_role = current_user.get("role", "user")

    # Admins must specify which user's conversation they are replying to
    if sender_role == "admin":
        target_user_id = body.get("user_id")
        if not target_user_id:
            raise HTTPException(status_code=400, detail="user_id is required for admin replies")
        conv = get_or_create_conversation(target_user_id)
    else:
        conv = get_or_create_conversation(sender_id)

    conv_id = str(conv["_id"])
    now = datetime.utcnow()

    users = database.get_collection("users")
    sender_doc = users.find_one({"_id": ObjectId(sender_id)})
    sender_name = sender_doc.get("username", sender_role) if sender_doc else sender_role

    msg = {
        "conversation_id": conv_id,
        "sender_id": sender_id,
        "sender_role": sender_role,
        "sender_name": sender_name,
        "text": text,
        "read": False,
        "created_at": now,
    }
    msgs = database.get_collection("messages")
    result = msgs.insert_one(msg)
    msg["_id"] = result.inserted_id

    # Update conversation metadata + unhide for the recipient
    convs = database.get_collection("conversations")
    if sender_role == "admin":
        convs.update_one(
            {"_id": conv["_id"]},
            {
                "$set": {
                    "updated_at": now,
                    "last_message": text[:80],
                    "hidden_for_admin": False,   # admin sent — show in their list
                    "hidden_for_user": False,     # unhide for user too
                    "hidden_for_user_at": None,
                },
                "$inc": {"unread_by_user": 1},
            },
        )
    else:
        convs.update_one(
            {"_id": conv["_id"]},
            {
                "$set": {
                    "updated_at": now,
                    "last_message": text[:80],
                    "hidden_for_user": False,    # user sent — show in their chat
                    "hidden_for_admin": False,   # unhide for admin
                    "hidden_for_admin_at": None,
                },
                "$inc": {"unread_by_admin": 1},
            },
        )

    return {"message": serialize_message(msg)}


# ── admin endpoints ───────────────────────────────────────────────────────────

@router.get("/conversations")
async def list_conversations(current_user: dict = Depends(get_current_user)):
    """Admin: list all user conversations sorted by most recent (excluding hidden ones)."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    convs = database.get_collection("conversations")
    # Exclude conversations the admin has hidden
    all_convs = list(convs.find({"hidden_for_admin": {"$ne": True}}).sort("updated_at", -1))

    users = database.get_collection("users")
    result = []
    for conv in all_convs:
        user_doc = users.find_one({"_id": ObjectId(conv["user_id"])})
        username = user_doc.get("username", conv["user_id"]) if user_doc else conv["user_id"]
        profile_image = user_doc.get("profile_image") if user_doc else None
        entry = serialize_conversation(conv)
        entry["username"] = username
        entry["profile_image"] = profile_image
        result.append(entry)

    return {"conversations": result}


@router.get("/conversation/{user_id}")
async def get_conversation(user_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: get all messages in a user's conversation (since admin last hid it)."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    conv = get_or_create_conversation(user_id)
    conv_id = str(conv["_id"])

    msgs = database.get_collection("messages")

    # Only show messages after admin un-hid / re-opened the conversation
    query: dict = {"conversation_id": conv_id}
    hidden_at = conv.get("hidden_for_admin_at")
    if hidden_at:
        query["created_at"] = {"$gt": hidden_at}

    messages = list(msgs.find(query).sort("created_at", 1))

    # Mark user→admin messages as read
    msgs.update_many(
        {"conversation_id": conv_id, "sender_role": "user", "read": False},
        {"$set": {"read": True}},
    )
    convs = database.get_collection("conversations")
    convs.update_one({"_id": conv["_id"]}, {"$set": {"unread_by_admin": 0}})

    users = database.get_collection("users")
    user_doc = users.find_one({"_id": ObjectId(user_id)})
    username = user_doc.get("username", user_id) if user_doc else user_id

    return {
        "conversation_id": conv_id,
        "user_id": user_id,
        "username": username,
        "messages": [serialize_message(m) for m in messages],
    }


@router.delete("/my")
async def delete_my_conversation(current_user: dict = Depends(get_current_user)):
    """User hides their conversation (messages stay, just not shown to them anymore)."""
    user_id = current_user["user_id"]
    convs = database.get_collection("conversations")
    conv = convs.find_one({"user_id": user_id})
    if not conv:
        return {"success": True, "message": "No conversation to hide"}

    now = datetime.utcnow()
    convs.update_one(
        {"_id": conv["_id"]},
        {"$set": {
            "hidden_for_user": True,
            "hidden_for_user_at": now,
            "unread_by_user": 0,
        }},
    )
    return {"success": True, "message": "Conversation hidden"}


@router.delete("/conversation/{user_id}")
async def admin_delete_conversation(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Admin hides a conversation from their list (user keeps their view)."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    convs = database.get_collection("conversations")
    conv = convs.find_one({"user_id": user_id})
    if not conv:
        return {"success": True, "message": "No conversation found"}

    now = datetime.utcnow()
    convs.update_one(
        {"_id": conv["_id"]},
        {"$set": {
            "hidden_for_admin": True,
            "hidden_for_admin_at": now,
            "unread_by_admin": 0,
        }},
    )
    return {"success": True, "message": "Conversation hidden from admin view"}


@router.get("/unread-count")
async def unread_count(current_user: dict = Depends(get_current_user)):
    """
    Users: count of unread admin replies.
    Admins: total unread messages from all users.
    """
    user_id = current_user["user_id"]
    role = current_user.get("role", "user")
    convs = database.get_collection("conversations")

    if role == "admin":
        pipeline = [{"$group": {"_id": None, "total": {"$sum": "$unread_by_admin"}}}]
        res = list(convs.aggregate(pipeline))
        count = res[0]["total"] if res else 0
    else:
        conv = convs.find_one({"user_id": user_id})
        count = conv.get("unread_by_user", 0) if conv else 0

    return {"unread_count": count}
