#!/usr/bin/env python3
"""
Migrate existing assets to add missing 'quantity' and 'in_stock' fields
"""
from pymongo import MongoClient
from datetime import datetime

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["blocklend"]
assets_collection = db["assets"]

# Get all assets
assets = assets_collection.find({})
count = 0

for asset in assets:
    # Check if quantity field exists
    if "quantity" not in asset:
        # Add default quantity of 1
        assets_collection.update_one(
            {"_id": asset["_id"]},
            {
                "$set": {
                    "quantity": 1,
                    "in_stock": True,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        count += 1
        print(f"✓ Updated: {asset['name']}")

print(f"\n✅ Migration complete! Updated {count} assets")

# Display updated assets
print("\nUpdated assets:")
for asset in assets_collection.find({}, {"_id": 1, "name": 1, "quantity": 1, "in_stock": 1}):
    print(f"  - {asset['name']}: qty={asset.get('quantity', 0)}, in_stock={asset.get('in_stock', False)}")
