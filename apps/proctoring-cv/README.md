# Proctoring CV sidecar (stub)

HTTP `POST /analyze` `{ objectKey }` → `{ violations: string[] }`. Default stub returns no flags so CI never needs InsightFace.

Real MediaPipe / InsightFace / Whisper adapters copy from the MCQ platform `core/providers` when `PROCTORING_CV_PROVIDER=real`.
