import logging
import boto3
from app.config import settings

logger = logging.getLogger(__name__)
_s3 = boto3.client("s3", region_name=settings.aws_region_name)


def upload_bytes(key: str, data: bytes, content_type: str) -> None:
    _s3.put_object(
        Bucket=settings.s3_exports_bucket,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    logger.info("Uploaded %s to s3://%s/%s", content_type, settings.s3_exports_bucket, key)


def presigned_url(key: str, expiry: int = 86_400) -> str:
    return _s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_exports_bucket, "Key": key},
        ExpiresIn=expiry,
    )
