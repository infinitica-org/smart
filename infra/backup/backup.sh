#!/usr/bin/env bash
# S6-VV-97 — one encrypted, off-box backup of Postgres + MinIO objects.
#
# Layout under ${BACKUP_DEST}/${BACKUP_ENV_NAME}/:
#   daily/<ts>/   db.dump.age, objects.tar.age, manifest.json   (kept 7 days)
#   weekly/<ts>/  copy of Sunday's daily                         (kept ~4 weeks)
#   monthly/<ts>/ copy of the 1st-of-month daily                 (kept ~3 months)
# manifest.json is written last, so its presence marks a complete backup.
#
# Plaintext never touches disk: pg_dump and tar stream straight into age.
# Only the age PUBLIC key lives on the server; restores need the offline
# private key (docs/delivery/BACKUP_RESTORE.md). Redis and Redpanda are out of
# scope: cache and outbox transport, rebuilt from Postgres.
set -Eeuo pipefail

: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT (age public key) is required}"
: "${BACKUP_DEST:?BACKUP_DEST (rclone destination, e.g. offsite:smart-backups) is required}"
: "${PGHOST:?}" "${PGUSER:?}" "${PGDATABASE:?}"

ENV_NAME="${BACKUP_ENV_NAME:-local}"
WORK_DIR="${BACKUP_WORK_DIR:-/work}"
METRICS_DIR="${BACKUP_METRICS_DIR:-/metrics}"
MINIO_SOURCE="${BACKUP_MINIO_SOURCE:-minio:${MINIO_BUCKET:-smart}}"
INCLUDE_OBJECTS="${BACKUP_INCLUDE_OBJECTS:-true}"
KEEP_DAILY="${BACKUP_KEEP_DAILY:-7d}"
KEEP_WEEKLY="${BACKUP_KEEP_WEEKLY:-29d}"
KEEP_MONTHLY="${BACKUP_KEEP_MONTHLY:-93d}"
# Tables whose row counts go in the manifest, so a restore drill can compare.
SANITY_TABLES="${BACKUP_SANITY_TABLES:-users institutions companies audit_logs evidence_records certificates applications}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
STARTED="$(date -u +%s)"
RUN_DIR="${WORK_DIR}/${TS}"
REMOTE_ROOT="${BACKUP_DEST%/}/${ENV_NAME}"
DAILY="${REMOTE_ROOT}/daily/${TS}"

log() { echo "backup[${ENV_NAME} ${TS}]: $*"; }

write_metric_file() {
  # $1 = file stem, rest = metric lines. Atomic rename so node-exporter never reads half a file.
  local stem="$1"
  shift
  mkdir -p "$METRICS_DIR"
  printf '%s\n' "$@" >"${METRICS_DIR}/.${stem}.prom.tmp"
  mv "${METRICS_DIR}/.${stem}.prom.tmp" "${METRICS_DIR}/${stem}.prom"
}

on_error() {
  local line="$1"
  log "FAILED at line ${line}"
  write_metric_file smart_backup_failure \
    '# HELP smart_backup_last_failure_timestamp_seconds Unix time of the last failed backup run.' \
    '# TYPE smart_backup_last_failure_timestamp_seconds gauge' \
    "smart_backup_last_failure_timestamp_seconds{env=\"${ENV_NAME}\"} $(date -u +%s)"
  rm -rf "$RUN_DIR"
}
trap 'on_error $LINENO' ERR

mkdir -p "$RUN_DIR"
log "starting -> ${DAILY}"

# 1. Postgres: custom-format dump streamed through age.
pg_dump --format=custom --no-owner --no-privileges \
  | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "${RUN_DIR}/db.dump.age"
DB_BYTES="$(stat -c %s "${RUN_DIR}/db.dump.age")"
log "database dump encrypted (${DB_BYTES} bytes)"

# Row counts + latest migration, taken right after the dump for the drill to compare.
counts_json=""
for table in $SANITY_TABLES; do
  if [[ "$(psql -Atqc "SELECT to_regclass('public.${table}') IS NOT NULL")" == "t" ]]; then
    count="$(psql -Atqc "SELECT count(*) FROM public.\"${table}\"")"
    counts_json+="${counts_json:+,}\"${table}\":${count}"
  fi
done
LAST_MIGRATION="$(psql -Atqc "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1" 2>/dev/null || true)"
PG_VERSION="$(psql -Atqc 'SHOW server_version')"

# 2. MinIO objects: mirror the bucket, then tar | age. The mirror is plaintext
#    on the work volume for the duration of the run only.
OBJECTS_BYTES=0
OBJECT_COUNT=0
if [[ "$INCLUDE_OBJECTS" == "true" ]]; then
  mkdir -p "${RUN_DIR}/objects"
  rclone copy "$MINIO_SOURCE" "${RUN_DIR}/objects" --fast-list --transfers 8
  OBJECT_COUNT="$(find "${RUN_DIR}/objects" -type f | wc -l | tr -d ' ')"
  tar -C "${RUN_DIR}/objects" -cf - . \
    | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "${RUN_DIR}/objects.tar.age"
  rm -rf "${RUN_DIR}/objects"
  OBJECTS_BYTES="$(stat -c %s "${RUN_DIR}/objects.tar.age")"
  log "objects archived (${OBJECT_COUNT} files, ${OBJECTS_BYTES} bytes encrypted)"
fi

# 3. Manifest (checksums are of the ENCRYPTED artifacts; the drill verifies them first).
sha() { sha256sum "$1" | cut -d' ' -f1; }
{
  echo '{'
  echo "  \"createdAt\": \"${TS}\","
  echo "  \"env\": \"${ENV_NAME}\","
  echo "  \"postgresVersion\": \"${PG_VERSION}\","
  echo "  \"lastMigration\": \"${LAST_MIGRATION}\","
  echo "  \"rowCounts\": {${counts_json}},"
  echo "  \"objectCount\": ${OBJECT_COUNT},"
  echo '  "artifacts": {'
  echo -n "    \"db.dump.age\": {\"bytes\": ${DB_BYTES}, \"sha256\": \"$(sha "${RUN_DIR}/db.dump.age")\"}"
  if [[ -f "${RUN_DIR}/objects.tar.age" ]]; then
    echo ','
    echo -n "    \"objects.tar.age\": {\"bytes\": ${OBJECTS_BYTES}, \"sha256\": \"$(sha "${RUN_DIR}/objects.tar.age")\"}"
  fi
  echo
  echo '  }'
  echo '}'
} >"${RUN_DIR}/manifest.json"

# 4. Upload: artifacts first, manifest last.
rclone copy "$RUN_DIR" "$DAILY" --exclude manifest.json
rclone copyto "${RUN_DIR}/manifest.json" "${DAILY}/manifest.json"
if [[ "$(date -u +%u)" == "7" ]]; then
  rclone copy "$DAILY" "${REMOTE_ROOT}/weekly/${TS}"
fi
if [[ "$(date -u +%d)" == "01" ]]; then
  rclone copy "$DAILY" "${REMOTE_ROOT}/monthly/${TS}"
fi
rm -rf "$RUN_DIR"

# 5. Retention (by upload age; weekly/monthly tiers are separate copies). A
#    tier that doesn't exist yet is fine; empty run folders are removed after.
prune() {
  local tier="$1" keep="$2"
  rclone lsf "${REMOTE_ROOT}/${tier}" >/dev/null 2>&1 || return 0
  rclone delete "${REMOTE_ROOT}/${tier}" --min-age "$keep"
  rclone rmdirs "${REMOTE_ROOT}/${tier}" --leave-root
}
prune daily "$KEEP_DAILY"
prune weekly "$KEEP_WEEKLY"
prune monthly "$KEEP_MONTHLY"

FINISHED="$(date -u +%s)"
write_metric_file smart_backup_success \
  '# HELP smart_backup_last_success_timestamp_seconds Unix time of the last complete backup upload.' \
  '# TYPE smart_backup_last_success_timestamp_seconds gauge' \
  "smart_backup_last_success_timestamp_seconds{env=\"${ENV_NAME}\"} ${FINISHED}" \
  '# HELP smart_backup_last_duration_seconds Wall-clock duration of the last successful backup.' \
  '# TYPE smart_backup_last_duration_seconds gauge' \
  "smart_backup_last_duration_seconds{env=\"${ENV_NAME}\"} $((FINISHED - STARTED))" \
  '# HELP smart_backup_last_size_bytes Encrypted size of each artifact in the last successful backup.' \
  '# TYPE smart_backup_last_size_bytes gauge' \
  "smart_backup_last_size_bytes{env=\"${ENV_NAME}\",artifact=\"db\"} ${DB_BYTES}" \
  "smart_backup_last_size_bytes{env=\"${ENV_NAME}\",artifact=\"objects\"} ${OBJECTS_BYTES}"
log "done in $((FINISHED - STARTED))s"
