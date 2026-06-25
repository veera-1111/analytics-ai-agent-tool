"""
DynamoDB client singleton — replaces SQLAlchemy session factory.
"""

import boto3
from app.config import settings

_dynamodb = None


def get_dynamodb():
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region_name)
    return _dynamodb


def get_table(table_name: str):
    return get_dynamodb().Table(table_name)
