# SMART — Backups (Postgres + object storage)

> Owner: Vishal V · Tickets: S6-VV-97 (backups, Zoho #576), S6-VV-98 (restore drill, Zoho #577)

Before S6-VV-97 there was **no backup of any kind**. Postgres and MinIO lived only in the
`postgres_data` / `minio_data` Docker volumes on the VPS, so losing the disk meant losing
everything.

## What runs

The `backup` service in `infra/docker/docker-compose.yml` (profile `vps`, so it deploys with
every VPS stack) runs `infra/backup/backup.sh` on `BACKUP_SCHEDULE` (cron, UTC; default
`30 20 * * *` = 02:00 IST). Each run:

1. Streams `pg_dump --format=custom` straight into `age`, so the plaintext dump never touches disk.
2. Mirrors the MinIO `smart` bucket to the work volume, then streams `tar` into `age` and deletes the mirror.
3. Writes `manifest.json`: sha256 of each **encrypted** artifact, row counts for key tables,
   the latest applied Prisma migration, the Postgres version and the object count.
4. Uploads to `${BACKUP_DEST}/${BACKUP_ENV_NAME}/daily/<timestamp>/` with the manifest
   **last** (a folder without a manifest is an incomplete run). Sunday's run is also copied
   to `weekly/`, and the 1st of the month's to `monthly/`.
5. Prunes by age: `daily` 7 days, `weekly` 29 days, `monthly` 93 days
   (`BACKUP_KEEP_DAILY|WEEKLY|MONTHLY`).
6. Writes Prometheus textfile metrics (see Monitoring).

Not backed up, on purpose: **Redis** (cache and rate-limit state) and **Redpanda** (event
transport; the outbox in Postgres is the source of truth). Both rebuild empty.

| RPO              | RTO target                                                 | Retention                      |
| ---------------- | ---------------------------------------------------------- | ------------------------------ |
| ≤ 24 h (nightly) | ≤ 2 h for Postgres; object restore scales with bucket size | 7 daily · 4 weekly · 3 monthly |

## Encryption and key custody

- Artifacts are encrypted to an **age public key** (`BACKUP_AGE_RECIPIENT`, `age1…`). That
  public key is the only key on the server.
- The **private key never lives on the VPS**. Generate it offline, keep two copies with two
  named holders (proposed: Tino + Vishal) in a password manager, and treat losing both as
  losing the backups.

```bash
# on a trusted machine (age: https://github.com/FiloSottile/age, or use the backup image)
docker run --rm --entrypoint age-keygen smart-backup > smart-backup-age.key
grep 'public key' smart-backup-age.key   # -> BACKUP_AGE_RECIPIENT
```

## Enabling on a VPS

1. **Pick the off-site target.** It must be an S3-compatible bucket at a **different
   provider** than the VPS (e.g. Backblaze B2, AWS S3, Cloudflare R2). Create a bucket and
   an access key limited to that bucket (read, write and delete objects; delete is only
   needed for pruning). Turning on object versioning or object lock at the provider is
   recommended, so a compromised VPS can't wipe the history.
2. **Set these in `.env.<env>`** on the server (see `.env.prod.example`):

   | Var                                                       | Example                                                     |
   | --------------------------------------------------------- | ----------------------------------------------------------- |
   | `BACKUP_ENABLED`                                          | `true`                                                      |
   | `BACKUP_ENV_NAME`                                         | `prod`                                                      |
   | `BACKUP_AGE_RECIPIENT`                                    | `age1…`                                                     |
   | `BACKUP_DEST`                                             | `offsite:smart-backups` (`offsite:<bucket>[/prefix]`)       |
   | `BACKUP_S3_PROVIDER`                                      | `Other` (B2), `AWS`, `Cloudflare`, … (rclone provider name) |
   | `BACKUP_S3_ENDPOINT`                                      | `https://s3.us-west-004.backblazeb2.com` (empty for AWS)    |
   | `BACKUP_S3_REGION`                                        | provider region, if required                                |
   | `BACKUP_S3_ACCESS_KEY_ID` / `BACKUP_S3_SECRET_ACCESS_KEY` | the scoped key                                              |

3. **Deploy** as usual (`bash scripts/deploy-vps.sh <env>`). Then force one run and confirm
   the upload:

```bash
C="docker compose --env-file .env.prod -f infra/docker/docker-compose.yml --profile apps --profile vps"
$C run --rm --no-deps backup backup.sh
$C run --rm --no-deps backup rclone lsf -R "offsite:smart-backups/prod/daily" | tail
```

Until `BACKUP_ENABLED=true`, the container idles and reports `smart_backup_enabled 0`.

## Monitoring

`backup.sh` writes to the shared `backup_metrics` volume, which `node-exporter` (profile
`obs`) reads with its textfile collector:

| Metric                                             | Meaning                            |
| -------------------------------------------------- | ---------------------------------- |
| `smart_backup_enabled{env}`                        | 1 when scheduled backups are on    |
| `smart_backup_last_success_timestamp_seconds{env}` | last complete upload               |
| `smart_backup_last_failure_timestamp_seconds{env}` | last failed run                    |
| `smart_backup_last_duration_seconds{env}`          | duration of the last success       |
| `smart_backup_last_size_bytes{env,artifact}`       | encrypted size of `db` / `objects` |

Alert (S6-VV-125): `time() - smart_backup_last_success_timestamp_seconds > 26h`, or
`smart_backup_enabled == 0` on prod.

## Restoring

<<<<<<< HEAD
A backup is only as good as its last restore. `infra/backup/restore.sh` (in the same
image) does both the routine drill and a real disaster recovery. It always:

1. Picks a complete backup (`--run <timestamp>`, default newest with a manifest; `--tier daily|weekly|monthly`).
2. Verifies the sha256 of each artifact against `manifest.json` before decrypting anything.
3. Decrypts with the **private** key and `pg_restore`s into the target database.
4. Requires the manifest's row counts and latest Prisma migration to match **exactly**. The
   counts come from the same snapshot as the dump, so any difference is a real problem.
5. With `--objects`, also decrypts the object archive and checks the file count.

It exits non-zero on any failed check. The private key is mounted read-only for the one run
and is never copied onto the server.

### Monthly restore drill (required)

Run it on the VPS, or on any machine with Docker and the repo, pointing at the same `.env`:

```bash
C="docker compose --env-file .env.prod -f infra/docker/docker-compose.yml --profile apps --profile vps"
$C run --rm --no-deps \
  -v /path/to/smart-backup-age.key:/run/secrets/backup_age_key:ro \
  backup restore.sh --objects
```

This restores into a scratch database, `smart_restore_check`, on the same Postgres, runs the
checks, then drops it. The live `smart` database is never touched. A pass writes
`smart_backup_last_restore_test_timestamp_seconds`; alert if it goes stale for more than 35
days. Record every drill in the log below.

### Disaster recovery (live restore)

Only when the live data is lost or corrupted. **This drops and recreates the live database.**

1. Stop writers: `$C stop api` (and anything else that writes to Postgres or MinIO).
2. Pick the backup (`--run <timestamp>`; list them with
   `$C run --rm --no-deps backup rclone lsf offsite:<bucket>/<env>/daily`).
3. Restore the database and put the objects back into MinIO:

   ```bash
   $C run --rm --no-deps \
     -v /path/to/smart-backup-age.key:/run/secrets/backup_age_key:ro \
     backup restore.sh --run <timestamp> --target-db smart --force-live --restore-objects
   ```

4. `bash scripts/deploy-vps.sh <env>` to bring everything back up. `prisma migrate deploy` is
   a no-op when the backup is on the current schema, and applies anything newer.
5. Expect to lose up to 24 h of data (RPO). Tell affected users, and check the audit log for
   the gap.

### Drill log

| Date (UTC) | Environment                                                    | Backup                         | Result | Notes                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | -------------------------------------------------------------- | ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-24 | local throwaway stack (`pgvector:pg16` + MinIO, 67 migrations) | `drill/daily/20260924T192408Z` | PASS   | 7/7 row counts + latest migration matched; 3/3 objects. Also passed: a tampered artifact is rejected by checksum; a wrong key fails to decrypt; restoring over `smart` without `--force-live` is refused; a full `--force-live --restore-objects` recovery brought 14 → 25 users and 2 → 3 objects back, and `prisma migrate status` was up to date afterwards. First real-environment drill pending D1 (off-site target). |
