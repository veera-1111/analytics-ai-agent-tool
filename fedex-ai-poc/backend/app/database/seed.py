"""
Synthetic logistics data generator.

Usage:
    python -m app.database.seed --profile sample           # ~25k orders (fast)
    python -m app.database.seed --profile full              # 500k orders, 2M events
    python -m app.database.seed --profile sample --seed 42  # reproducible

Encodes realistic correlations:
  - Monsoon months (Jun–Sep) → higher delay rates
  - Express shipments → higher cost
  - Tier-2 cities → higher COD usage
  - Heavy packages (>15 kg) → higher delay rates
  - Underperforming hubs → elevated SLA breaches
"""

import argparse
import random
import sys
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from peewee import chunked

from app.database.models import (
    ALL_MODELS,
    Hub,
    Order,
    Payment,
    SavedReport,
    TrackingEvent,
    db,
    init_db,
)

# ---------------------------------------------------------------------------
# Configuration profiles
# ---------------------------------------------------------------------------
PROFILES = {
    "sample": {
        "hubs": 100,
        "orders": 25_000,
        "events_per_order": 4,
        "payments_per_order": 1,
    },
    "full": {
        "hubs": 100,
        "orders": 500_000,
        "events_per_order": 4,    # 500k * 4 = 2M tracking events
        "payments_per_order": 1,  # 500k payments
    },
}

# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------
REGIONS = ["North", "South", "East", "West"]

CITIES = {
    "North": [
        ("Delhi", "Delhi", "metro"),
        ("Chandigarh", "Punjab", "metro"),
        ("Jaipur", "Rajasthan", "tier2"),
        ("Lucknow", "Uttar Pradesh", "tier2"),
        ("Dehradun", "Uttarakhand", "tier3"),
    ],
    "South": [
        ("Bangalore", "Karnataka", "metro"),
        ("Chennai", "Tamil Nadu", "metro"),
        ("Hyderabad", "Telangana", "metro"),
        ("Coimbatore", "Tamil Nadu", "tier2"),
        ("Kochi", "Kerala", "tier2"),
    ],
    "East": [
        ("Kolkata", "West Bengal", "metro"),
        ("Bhubaneswar", "Odisha", "tier2"),
        ("Patna", "Bihar", "tier2"),
        ("Guwahati", "Assam", "tier3"),
        ("Ranchi", "Jharkhand", "tier3"),
    ],
    "West": [
        ("Mumbai", "Maharashtra", "metro"),
        ("Pune", "Maharashtra", "metro"),
        ("Ahmedabad", "Gujarat", "tier2"),
        ("Surat", "Gujarat", "tier2"),
        ("Indore", "Madhya Pradesh", "tier3"),
    ],
}

STATUSES = ["delivered", "in_transit", "delayed", "returned"]
SHIPMENT_TYPES = ["express", "standard"]
PAYMENT_TYPES = ["cod", "prepaid"]
MONSOON_MONTHS = {6, 7, 8, 9}

EVENT_SEQUENCE = [
    "Order Placed",
    "Picked Up",
    "In Transit",
    "Out for Delivery",
    "Delivered",
]

DELAY_EVENT_SEQUENCE = [
    "Order Placed",
    "Picked Up",
    "In Transit",
    "Delayed at Hub",
    "In Transit",
    "Out for Delivery",
    "Delivered",
]

# ---------------------------------------------------------------------------
# Hub generation
# ---------------------------------------------------------------------------
def generate_hubs(count: int, rng: random.Random) -> list[dict]:
    """Generate hub records. ~10% are intentionally underperforming."""
    hubs = []
    hub_id = 0
    for region, city_list in CITIES.items():
        per_region = count // len(CITIES)
        for i in range(per_region):
            city, state, tier = city_list[i % len(city_list)]
            hub_id += 1
            hubs.append({
                "name": f"{city} Hub {hub_id:03d}",
                "city": city,
                "state": state,
                "region": region,
                "tier": tier,
                "is_underperforming": 1 if rng.random() < 0.10 else 0,
            })
    return hubs


# ---------------------------------------------------------------------------
# Order generation — encodes all required correlations
# ---------------------------------------------------------------------------
def generate_orders(hubs: list, count: int, rng: random.Random):
    """Yield order dicts with embedded correlation logic."""
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2024, 12, 31)
    delta_days = (end_date - start_date).days

    for i in range(count):
        hub = rng.choice(hubs)
        created_at = start_date + timedelta(
            days=rng.randint(0, delta_days),
            hours=rng.randint(0, 23),
            minutes=rng.randint(0, 59),
        )
        month = created_at.month

        shipment_type = rng.choice(SHIPMENT_TYPES)
        weight = round(rng.uniform(0.5, 30.0), 2)

        # ── Delay probability correlations ──────────────────
        delay_prob = 0.08  # baseline 8%

        # Monsoon months → higher delays
        if month in MONSOON_MONTHS:
            delay_prob += 0.15

        # Underperforming hub → higher delays
        if hub["is_underperforming"]:
            delay_prob += 0.20

        # Heavy packages → higher delays
        if weight > 15.0:
            delay_prob += 0.10

        is_delayed = rng.random() < delay_prob
        is_returned = rng.random() < 0.02  # 2% return rate

        if is_returned:
            status = "returned"
        elif is_delayed:
            status = "delayed"
        elif rng.random() < 0.05:
            status = "in_transit"
        else:
            status = "delivered"

        sla_hours = 48 if shipment_type == "express" else 96
        sla_deadline = created_at + timedelta(hours=sla_hours)

        delivered_at = None
        if status == "delivered":
            delivery_hours = rng.uniform(12, sla_hours - 4)
            delivered_at = created_at + timedelta(hours=delivery_hours)
        elif status == "delayed":
            delivery_hours = rng.uniform(sla_hours + 2, sla_hours * 2)
            delivered_at = created_at + timedelta(hours=delivery_hours)

        # Pick origin/destination from same region cities
        region = hub["region"]
        origin_city = hub["city"]
        dest_candidates = [c[0] for c in CITIES[region] if c[0] != origin_city]
        destination_city = rng.choice(dest_candidates) if dest_candidates else origin_city

        yield {
            "hub_id": hub["id"],
            "tracking_number": f"TRK{uuid.uuid4().hex[:12].upper()}",
            "status": status,
            "origin_city": origin_city,
            "destination_city": destination_city,
            "shipment_type": shipment_type,
            "weight": weight,
            "created_at": created_at,
            "delivered_at": delivered_at,
            "sla_deadline": sla_deadline,
            "_hub_tier": hub["tier"],  # used for payment correlation, not stored
        }


# ---------------------------------------------------------------------------
# Payment generation — COD/prepaid correlation with city tier
# ---------------------------------------------------------------------------
def generate_payment(order: dict, rng: random.Random) -> dict:
    """COD preference in tier-2/3 cities; express → higher amounts."""
    hub_tier = order.get("_hub_tier", "metro")

    # Tier-2/3 cities → higher COD usage
    if hub_tier in ("tier2", "tier3"):
        cod_prob = 0.60
    else:
        cod_prob = 0.25

    payment_type = "cod" if rng.random() < cod_prob else "prepaid"

    # Express shipments → higher amounts
    if order["shipment_type"] == "express":
        amount = round(rng.uniform(300, 2500), 2)
    else:
        amount = round(rng.uniform(80, 800), 2)

    return {
        "order_id": order["id"],
        "amount": Decimal(str(amount)),
        "payment_type": payment_type,
        "status": "completed",
        "created_at": order["created_at"],
    }


# ---------------------------------------------------------------------------
# Tracking event generation
# ---------------------------------------------------------------------------
def generate_events(order: dict, rng: random.Random) -> list[dict]:
    """Generate a sequence of tracking events for an order."""
    sequence = DELAY_EVENT_SEQUENCE if order["status"] == "delayed" else EVENT_SEQUENCE
    events = []
    ts = order["created_at"]

    for step in sequence:
        ts = ts + timedelta(hours=rng.uniform(1, 12))
        events.append({
            "order_id": order["id"],
            "status": step,
            "location": order["origin_city"] if step in ("Order Placed", "Picked Up") else order["destination_city"],
            "event_timestamp": ts,
            "description": f"{step} at {ts.strftime('%Y-%m-%d %H:%M')}",
        })
    return events


# ---------------------------------------------------------------------------
# Main seeding logic
# ---------------------------------------------------------------------------
def seed(profile_name: str, seed_value: int | None = None):
    rng = random.Random(seed_value)

    cfg = PROFILES[profile_name]
    print(f"╔══ Seeding profile: {profile_name} (seed={seed_value}) ══╗")
    print(f"║  Hubs:   {cfg['hubs']:>10,}")
    print(f"║  Orders: {cfg['orders']:>10,}")
    print(f"║  Events: {cfg['orders'] * cfg['events_per_order']:>10,}")
    print(f"║  Payments:{cfg['orders'] * cfg['payments_per_order']:>9,}")
    print("╚════════════════════════════════════════════════════╝")

    # Clear existing data
    with db.atomic():
        for model in reversed(ALL_MODELS):
            model.delete().execute()
    print("  ✓ Cleared existing data")

    # ── Hubs ──────────────────────────────────────────────
    hub_dicts = generate_hubs(cfg["hubs"], rng)
    with db.atomic():
        for batch in chunked(hub_dicts, 100):
            Hub.insert_many(batch).execute()
    # Reload with IDs
    hubs = list(Hub.select().dicts())
    print(f"  ✓ Inserted {len(hubs)} hubs")

    # ── Orders (batched) ──────────────────────────────────
    BATCH = 5_000
    order_buffer = []
    total_orders = 0

    for order_dict in generate_orders(hubs, cfg["orders"], rng):
        order_buffer.append(order_dict)
        if len(order_buffer) >= BATCH:
            _flush_orders(order_buffer, rng, cfg)
            total_orders += len(order_buffer)
            print(f"    … {total_orders:,} / {cfg['orders']:,} orders", end="\r")
            order_buffer = []

    if order_buffer:
        _flush_orders(order_buffer, rng, cfg)
        total_orders += len(order_buffer)

    print(f"  ✓ Inserted {total_orders:,} orders + events + payments")
    print("✓ Seeding complete.")


def _flush_orders(order_buffer: list[dict], rng: random.Random, cfg: dict):
    """Insert a batch of orders, their events, and payments atomically."""
    # Strip the _hub_tier helper key before insert
    insert_data = [{k: v for k, v in o.items() if not k.startswith("_")} for o in order_buffer]

    with db.atomic():
        Hub.select()  # ensure connection
        Order.insert_many(insert_data).execute()

    # Fetch the inserted orders to get their IDs
    last_tracking_numbers = [o["tracking_number"] for o in order_buffer]
    inserted = list(
        Order.select()
        .where(Order.tracking_number.in_(last_tracking_numbers))
        .dicts()
    )

    # Merge IDs back for event/payment generation
    tn_to_id = {o["tracking_number"]: o["id"] for o in inserted}
    for o in order_buffer:
        o["id"] = tn_to_id[o["tracking_number"]]

    # ── Events ────────────────────────────────────────────
    all_events = []
    for o in order_buffer:
        all_events.extend(generate_events(o, rng))

    with db.atomic():
        for batch in chunked(all_events, 5_000):
            TrackingEvent.insert_many(batch).execute()

    # ── Payments ──────────────────────────────────────────
    all_payments = [generate_payment(o, rng) for o in order_buffer]
    with db.atomic():
        for batch in chunked(all_payments, 5_000):
            Payment.insert_many(batch).execute()


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Seed the analytics database.")
    parser.add_argument("--profile", choices=list(PROFILES.keys()), default="sample")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducibility")
    parser.add_argument("--path", type=str, default=None, help="Override DB_PATH")
    args = parser.parse_args()

    init_db(args.path)
    seed(args.profile, args.seed)


if __name__ == "__main__":
    main()
