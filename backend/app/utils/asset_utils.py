"""Helpers for normalizing asset availability fields from MongoDB documents."""


def parse_quantity(raw, default=0):
    """Parse quantity without treating 0 as missing."""
    if raw is None:
        return default
    try:
        return max(0, int(raw))
    except (TypeError, ValueError):
        return default


def normalize_asset_availability(asset: dict) -> dict:
    """
    Ensure quantity and in_stock are consistent with the database record.

    Legacy assets without a quantity field default to 1 in stock.
    """
    if "quantity" not in asset:
        quantity = 1
    else:
        quantity = parse_quantity(asset.get("quantity"), default=0)

    stored_in_stock = asset.get("in_stock")
    if stored_in_stock is None:
        in_stock = quantity > 0
    else:
        in_stock = bool(stored_in_stock) and quantity > 0

    asset["quantity"] = quantity
    asset["in_stock"] = in_stock
    return asset


def get_stock_state(asset: dict) -> tuple[int, bool]:
    """Return normalized (quantity, in_stock) for an asset document."""
    normalized = dict(asset)
    normalize_asset_availability(normalized)
    return normalized["quantity"], normalized["in_stock"]


def is_asset_available(asset: dict) -> bool:
    """Return True when an asset can be borrowed."""
    quantity, in_stock = get_stock_state(asset)
    return in_stock and quantity > 0
