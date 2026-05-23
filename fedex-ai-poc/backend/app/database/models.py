"""
Peewee ORM models for the logistics analytics database.

Tables:
  - Hub: distribution hub locations
  - Order: shipment orders linked to hubs
  - TrackingEvent: timestamped tracking events per order
  - Payment: payment records per order
  - SavedReport: persisted report metadata (config, layout, title)
"""

import os
from datetime import datetime

from peewee import (
    AutoField,
    CharField,
    DateTimeField,
    DecimalField,
    FloatField,
    ForeignKeyField,
    IntegerField,
    Model,
    SqliteDatabase,
    TextField,
)

# ---------------------------------------------------------------------------
# Database connection
# ---------------------------------------------------------------------------
DB_PATH = os.getenv("DB_PATH", "/data/analytics.db")
db = SqliteDatabase(None)  # deferred init — call init_db() at startup


def init_db(path: str | None = None):
    """Initialise (or re-initialise) the SQLite database connection."""
    target = path or DB_PATH
    db.init(target, pragmas={
        "journal_mode": "wal",       # better concurrent read performance
        "cache_size": -64_000,       # 64 MB page cache
        "foreign_keys": 1,           # enforce FK constraints
        "synchronous": "normal",     # good balance of safety vs speed
    })


# ---------------------------------------------------------------------------
# Base model
# ---------------------------------------------------------------------------
class BaseModel(Model):
    class Meta:
        database = db


# ---------------------------------------------------------------------------
# Hub — distribution / sorting centres
# ---------------------------------------------------------------------------
class Hub(BaseModel):
    id = AutoField()
    name = CharField(max_length=200)
    city = CharField(max_length=100, index=True)
    state = CharField(max_length=100, index=True)
    region = CharField(max_length=50, index=True)
    tier = CharField(max_length=20, default="metro")  # metro | tier2 | tier3
    is_underperforming = IntegerField(default=0)       # 1 = intentionally slow hub

    class Meta:
        table_name = "hub"


# ---------------------------------------------------------------------------
# Order — shipment orders
# ---------------------------------------------------------------------------
class Order(BaseModel):
    id = AutoField()
    hub = ForeignKeyField(Hub, backref="orders", index=True)
    tracking_number = CharField(max_length=30, unique=True, index=True)
    status = CharField(max_length=30, index=True)          # delivered | in_transit | delayed | returned
    origin_city = CharField(max_length=100)
    destination_city = CharField(max_length=100)
    shipment_type = CharField(max_length=20, index=True)   # express | standard
    weight = FloatField()                                   # kg
    created_at = DateTimeField(default=datetime.utcnow, index=True)
    delivered_at = DateTimeField(null=True)
    sla_deadline = DateTimeField(null=True)

    class Meta:
        table_name = "order"
        indexes = (
            (("hub_id", "created_at"), False),
            (("status", "shipment_type"), False),
        )


# ---------------------------------------------------------------------------
# TrackingEvent — per-order status updates
# ---------------------------------------------------------------------------
class TrackingEvent(BaseModel):
    id = AutoField()
    order = ForeignKeyField(Order, backref="events", index=True)
    status = CharField(max_length=50)
    location = CharField(max_length=200)
    event_timestamp = DateTimeField(index=True)
    description = TextField(default="")

    class Meta:
        table_name = "tracking_event"
        indexes = (
            (("order_id", "event_timestamp"), False),
        )


# ---------------------------------------------------------------------------
# Payment — financial records per order
# ---------------------------------------------------------------------------
class Payment(BaseModel):
    id = AutoField()
    order = ForeignKeyField(Order, backref="payments", index=True)
    amount = DecimalField(decimal_places=2, auto_round=True)
    payment_type = CharField(max_length=20, index=True)  # cod | prepaid
    status = CharField(max_length=20, default="completed")
    created_at = DateTimeField(default=datetime.utcnow)

    class Meta:
        table_name = "payment"
        indexes = (
            (("order_id", "payment_type"), False),
        )


# ---------------------------------------------------------------------------
# SavedReport — persisted report metadata
# ---------------------------------------------------------------------------
class SavedReport(BaseModel):
    id = AutoField()
    title = CharField(max_length=500)
    config_json = TextField()     # semantic query JSON
    layout_json = TextField(default="{}")  # visualisation layout hints
    created_at = DateTimeField(default=datetime.utcnow, index=True)

    class Meta:
        table_name = "saved_report"


# ---------------------------------------------------------------------------
# All models for table creation / iteration
# ---------------------------------------------------------------------------
ALL_MODELS = [Hub, Order, TrackingEvent, Payment, SavedReport]
