# Proctoring CV sidecar

HTTP `POST /analyze` `{ objectKey }` → `{ violations, yaw, pitch, faceCount }`.

| `Unified YOLO object detection (phone, person, book, laptop, etc.) as `FOREIGN_OBJECT_DETECTED`. Env `PROCTORING_OBJECT_CONF` (default 0.45).

| `PROCTORING_CV_PROVIDER`` | Behavior                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `stub` (default)          | Returns no violations; accepts legacy `stub:` keys                                    |
| `real`                    | Fetches JPEG from MinIO, runs YuNet faces + solvePnP head pose + YOLOv8n phone detect |

Requires `S3_*` env vars (same bucket as api-core). Docker image downloads ONNX models at build time.

Tests: `python -m pytest tests/`
