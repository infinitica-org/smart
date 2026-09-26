# Storage encryption at rest (S6-VV-119)

Uploaded files (evidence, company verification documents, work-experience proofs, certificates,
data exports) live in the MinIO bucket `smart`. This runbook turns on **server-side encryption
(SSE-S3)** for that bucket and keeps it on.

## How it works

- MinIO encrypts objects with a key derived from `MINIO_KMS_SECRET_KEY` (single-key KMS mode).
- `minio-init` sets **bucket default encryption** (`mc encrypt set sse-s3 local/smart`) whenever the
  key is present. That covers browser uploads through presigned PUT URLs with no client change.
- The API adds `ServerSideEncryption: AES256` to its own writes when `S3_ENCRYPTION=required`, and
  **refuses to boot** if the bucket has no default encryption. An unencrypted bucket can't quietly
  take uploads.
- Reads are transparent: signed download URLs and backups (`BACKUP_RESTORE.md`) get plaintext
  from MinIO. Backups are encrypted separately with `age`.

## The key

> **Losing `MINIO_KMS_SECRET_KEY` makes every encrypted object permanently unreadable.**

- Generate once per environment: `echo "smart-key:$(openssl rand -base64 32)"`.
- Store it wherever the backup `age` private key is kept (D1), with the same two holders. Keep it
  outside the VPS as well as in the VPS `.env`.
- A restore drill (`BACKUP_RESTORE.md`) restores objects through the API, so it doesn't need the old
  key. The live bucket does.

## Rollout (per environment: dev, then qa, then prod)

1. Add `MINIO_KMS_SECRET_KEY=smart-key:...` to the VPS `.env`. Leave `S3_ENCRYPTION=off`.
2. `docker compose ... up -d minio minio-init`. MinIO restarts with the KMS, and `minio-init` logs
   `Auto encryption 'sse-s3' is enabled`.
3. New objects are now encrypted. Check one: `mc stat local/smart/<key>` shows `Encryption: SSE-S3`.
4. Re-encrypt what was already there (a self-copy rewrites each object under the default):
   `mc cp -r local/smart/ local/smart/`. This was tested on MinIO: objects written before the
   switch read back fine and show `SSE-S3` afterwards.
5. Set `S3_ENCRYPTION=required` and redeploy the API. If step 2 didn't happen, the API refuses to
   start and says what to run.

Rollback: set `S3_ENCRYPTION=off` and redeploy. Leave the KMS key in place, since encrypted objects need it.

## In transit and the database (accepted risks, recorded here)

- **Public traffic** is TLS end to end through Caddy (browsers → Caddy → API, and presigned URLs
  on the public MinIO host).
- **Internal traffic** (API → MinIO, API → Postgres) is plain on the private Docker network of a
  single VPS. Accepted for now: nothing crosses a host boundary. Revisit if services split across
  hosts.
- **Postgres at rest** is protected by VPS disk encryption, which is an infrastructure setting,
  not app code. Track it as an infra ticket; this runbook doesn't fake it.
