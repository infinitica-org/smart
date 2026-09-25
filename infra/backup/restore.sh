#!/usr/bin/env bash
# S6-VV-98 — restore a backup made by backup.sh and prove it is usable.
#
#   restore.sh [--run <timestamp>|latest] [--tier daily|weekly|monthly]
#              [--target-db <name>] [--keep] [--objects] [--restore-objects] [--force-live]
#
# Default = the monthly drill: take the newest complete backup, verify the
# checksums in its manifest, decrypt, restore into a scratch database
# (smart_restore_check), require the manifest's row counts and latest
# migration to match exactly, then drop the scratch database. Exits non-zero
# on any mismatch.
#
#   --objects          also decrypt the object archive and check its file count
#   --restore-objects  also copy the objects back into MinIO (disaster recovery)
#   --force-live       allow --target-db to be the live database (disaster recovery;
#                      stop api first — see docs/delivery/BACKUP_RESTORE.md)
#
# Needs the age PRIVATE key at $BACKUP_AGE_IDENTITY. Mount it read-only for the
# run only; it must never be left on the server.
set -Eeuo pipefail

RUN="latest"
TIER="daily"
TARGET_DB="smart_restore_check"
KEEP=false
WITH_OBJECTS=false
RESTORE_OBJECTS=false
FORCE_LIVE=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --run) RUN="$2"; shift 2 ;;
    --tier) TIER="$2"; shift 2 ;;
    --target-db) TARGET_DB="$2"; shift 2 ;;
    --keep) KEEP=true; shift ;;
    --objects) WITH_OBJECTS=true; shift ;;
    --restore-objects) WITH_OBJECTS=true; RESTORE_OBJECTS=true; shift ;;
    --force-live) FORCE_LIVE=true; shift ;;
    *) echo "restore: unknown argument $1" >&2; exit 2 ;;
  esac
done

: "${BACKUP_DEST:?BACKUP_DEST is required}"
: "${PGHOST:?}" "${PGUSER:?}" "${PGDATABASE:?}"
IDENTITY="${BACKUP_AGE_IDENTITY:-/run/secrets/backup_age_key}"
ENV_NAME="${BACKUP_ENV_NAME:-local}"
METRICS_DIR="${BACKUP_METRICS_DIR:-/metrics}"
MINIO_SOURCE="${BACKUP_MINIO_SOURCE:-minio:${MINIO_BUCKET:-smart}}"
TIER_ROOT="${BACKUP_DEST%/}/${ENV_NAME}/${TIER}"

log() { echo "restore[${ENV_NAME}]: $*"; }
die() {
  log "ERROR: $*"
  exit 1
}

[[ -r "$IDENTITY" ]] || die "age private key not readable at ${IDENTITY} (set BACKUP_AGE_IDENTITY)"
if [[ "$TARGET_DB" == "$PGDATABASE" && "$FORCE_LIVE" != "true" ]]; then
  die "refusing to restore over the live database '${PGDATABASE}' without --force-live"
fi

# Resolve the run: newest folder in the tier that has a manifest (complete upload).
if [[ "$RUN" == "latest" ]]; then
  RUN=""
  while read -r dir; do
    dir="${dir%/}"
    if rclone lsf "${TIER_ROOT}/${dir}/manifest.json" >/dev/null 2>&1; then
      RUN="$dir"
      break
    fi
  done < <(rclone lsf --dirs-only "$TIER_ROOT" | sort -r)
  [[ -n "$RUN" ]] || die "no complete backup found under ${TIER_ROOT}"
fi
SOURCE="${TIER_ROOT}/${RUN}"

WORK="$(mktemp -d "${BACKUP_WORK_DIR:-/work}/restore.XXXXXX")"
cleanup() {
  rm -rf "$WORK"
  if [[ "$KEEP" != "true" && "$TARGET_DB" != "$PGDATABASE" ]]; then
    dropdb --if-exists "$TARGET_DB" 2>/dev/null || true
  fi
}
trap cleanup EXIT

log "using ${SOURCE}"
if [[ "$WITH_OBJECTS" == "true" ]]; then
  rclone copy "$SOURCE" "$WORK"
else
  rclone copy "$SOURCE" "$WORK" --exclude objects.tar.age
fi
MANIFEST="${WORK}/manifest.json"
[[ -f "$MANIFEST" ]] || die "manifest.json missing in ${SOURCE}"

verify_sha() {
  local name="$1" expected actual
  expected="$(jq -r --arg n "$name" '.artifacts[$n].sha256 // empty' "$MANIFEST")"
  [[ -n "$expected" ]] || die "${name} is not listed in the manifest"
  actual="$(sha256sum "${WORK}/${name}" | cut -d' ' -f1)"
  [[ "$expected" == "$actual" ]] || die "${name} checksum mismatch (manifest ${expected}, file ${actual})"
  log "${name} checksum ok"
}
verify_sha db.dump.age

# Restore the database.
STARTED="$(date -u +%s)"
if [[ "$TARGET_DB" == "$PGDATABASE" ]]; then
  dropdb --if-exists --force "$TARGET_DB"
else
  dropdb --if-exists "$TARGET_DB"
fi
createdb "$TARGET_DB"
age --decrypt --identity "$IDENTITY" "${WORK}/db.dump.age" \
  | pg_restore --no-owner --no-privileges --exit-on-error --dbname "$TARGET_DB"
log "database restored into '${TARGET_DB}' in $(($(date -u +%s) - STARTED))s"

# Compare against the manifest (taken from the same snapshot as the dump).
FAILURES=0
while read -r table expected; do
  actual="$(psql -X -Atq -d "$TARGET_DB" -c "SELECT count(*) FROM public.\"${table}\"")"
  if [[ "$actual" == "$expected" ]]; then
    log "  ${table}: ${actual} rows (matches)"
  else
    log "  ${table}: ${actual} rows, manifest says ${expected} (MISMATCH)"
    FAILURES=$((FAILURES + 1))
  fi
done < <(jq -r '.rowCounts | to_entries[] | "\(.key) \(.value)"' "$MANIFEST")

expected_migration="$(jq -r '.lastMigration' "$MANIFEST")"
actual_migration="$(psql -X -Atq -d "$TARGET_DB" -c "SELECT coalesce((SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1), '')")"
if [[ "$actual_migration" == "$expected_migration" ]]; then
  log "  latest migration: ${actual_migration} (matches)"
else
  log "  latest migration: '${actual_migration}', manifest says '${expected_migration}' (MISMATCH)"
  FAILURES=$((FAILURES + 1))
fi

# Objects.
if [[ "$WITH_OBJECTS" == "true" ]]; then
  if jq -e '.artifacts["objects.tar.age"]' "$MANIFEST" >/dev/null; then
    verify_sha objects.tar.age
    mkdir -p "${WORK}/objects"
    age --decrypt --identity "$IDENTITY" "${WORK}/objects.tar.age" | tar -C "${WORK}/objects" -xf -
    actual_objects="$(find "${WORK}/objects" -type f | wc -l | tr -d ' ')"
    expected_objects="$(jq -r '.objectCount' "$MANIFEST")"
    if [[ "$actual_objects" == "$expected_objects" ]]; then
      log "  objects: ${actual_objects} files (matches)"
    else
      log "  objects: ${actual_objects} files, manifest says ${expected_objects} (MISMATCH)"
      FAILURES=$((FAILURES + 1))
    fi
    if [[ "$RESTORE_OBJECTS" == "true" && "$FAILURES" -eq 0 ]]; then
      rclone copy "${WORK}/objects" "$MINIO_SOURCE"
      log "  objects copied back to ${MINIO_SOURCE}"
    fi
  else
    log "  objects: not part of this backup (BACKUP_INCLUDE_OBJECTS was off)"
  fi
fi

if [[ "$FAILURES" -gt 0 ]]; then
  die "${FAILURES} check(s) failed for ${SOURCE}"
fi

if [[ "$TARGET_DB" != "$PGDATABASE" ]]; then
  mkdir -p "$METRICS_DIR"
  {
    echo '# HELP smart_backup_last_restore_test_timestamp_seconds Unix time of the last passing restore drill.'
    echo '# TYPE smart_backup_last_restore_test_timestamp_seconds gauge'
    echo "smart_backup_last_restore_test_timestamp_seconds{env=\"${ENV_NAME}\"} $(date -u +%s)"
  } >"${METRICS_DIR}/.smart_backup_restore.prom.tmp"
  mv "${METRICS_DIR}/.smart_backup_restore.prom.tmp" "${METRICS_DIR}/smart_backup_restore.prom"
fi
log "PASS: ${SOURCE} restored and verified$([[ "$KEEP" == "true" ]] && echo " (kept '${TARGET_DB}')")"
