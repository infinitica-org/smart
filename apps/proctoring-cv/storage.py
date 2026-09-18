"""Fetch proctoring snapshot JPEGs from S3-compatible object storage."""

from __future__ import annotations

import os
from typing import Optional

import boto3
from botocore.client import Config


def fetch_object_bytes(object_key: str) -> Optional[bytes]:
    if object_key.startswith("stub:"):
        return None
    endpoint = os.environ.get("S3_ENDPOINT", "http://127.0.0.1:9000")
    bucket = os.environ.get("S3_BUCKET", "smart")
    access_key = os.environ.get("S3_ACCESS_KEY", "minioadmin")
    secret_key = os.environ.get("S3_SECRET_KEY", "minioadmin")
    region = os.environ.get("S3_REGION", "us-east-1")
    client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
        config=Config(signature_version="s3v4"),
    )
    try:
        response = client.get_object(Bucket=bucket, Key=object_key)
        return response["Body"].read()
    except Exception:
        return None
