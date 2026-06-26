from bson.objectid import ObjectId

from config.database import database


def delete_user_completely(user_id: str) -> bool:
    """Remove a user and all related records from the database."""
    if not ObjectId.is_valid(user_id):
        return False

    users_collection = database.get_collection("users")
    if not users_collection.find_one({"_id": ObjectId(user_id)}):
        return False

    borrows_collection = database.get_collection("borrows")
    borrow_ids = [
        str(doc["_id"])
        for doc in borrows_collection.find({"borrower_id": user_id}, {"_id": 1})
    ]

    transactions_collection = database.get_collection("transactions")
    tx_filters = [{"user_id": user_id}]
    if borrow_ids:
        tx_filters.append({"borrow_id": {"$in": borrow_ids}})
    transactions_collection.delete_many({"$or": tx_filters})

    borrows_collection.delete_many({"borrower_id": user_id})
    database.get_collection("penalties").delete_many({"user_id": user_id})
    database.get_collection("notifications").delete_many({"user_id": user_id})
    database.get_collection("points").delete_one({"user_id": user_id})
    users_collection.delete_one({"_id": ObjectId(user_id)})
    return True
