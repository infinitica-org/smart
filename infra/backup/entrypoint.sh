#!/usr/bin/env bash
# Runs the nightly backup on BACKUP_SCHEDULE (cron syntax, UTC) when
# BACKUP_ENABLED=true; otherwise idles so an unconfigured environment deploys
# cleanly and reports smart_backup_enabled 0. Any other argument is executed
# as-is, e.g. `docker compose run --rm backup backup.sh` for an on-demand run.
set -euo pipefail

if [[ $# -gt 0 ]]; then
  exec "$@"
fi

METRICS_DIR="${BACKUP_METRICS_DIR:-/metrics}"
ENV_NAME="${BACKUP_ENV_NAME:-local}"
mkdir -p "$METRICS_DIR"

write_enabled_metric() {
  local tmp="${METRICS_DIR}/.smart_backup_enabled.prom.tmp"
  {
    echo '# HELP smart_backup_enabled 1 when scheduled backups are configured and running.'
    echo '# TYPE smart_backup_enabled gauge'
    echo "smart_backup_enabled{env=\"${ENV_NAME}\"} $1"
  } >"$tmp"
  mv "$tmp" "${METRICS_DIR}/smart_backup_enabled.prom"
}

if [[ "${BACKUP_ENABLED:-false}" != "true" ]]; then
  echo "backup: BACKUP_ENABLED is not true, so scheduled backups are off (see docs/delivery/BACKUP_RESTORE.md)"
  write_enabled_metric 0
  exec sleep infinity
fi

: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT (age public key) is required when BACKUP_ENABLED=true}"
: "${BACKUP_DEST:?BACKUP_DEST (rclone destination, e.g. offsite:smart-backups) is required when BACKUP_ENABLED=true}"

SCHEDULE="${BACKUP_SCHEDULE:-30 20 * * *}"
# crond does not pass the container environment to jobs, so snapshot it (in
# bash `declare -x` form, which is why the job runs under bash, not ash).
export -p >/etc/backup.env
chmod 600 /etc/backup.env
echo "${SCHEDULE} /bin/bash -c '. /etc/backup.env && /usr/local/bin/backup.sh' >/proc/1/fd/1 2>/proc/1/fd/2" >/etc/crontabs/root

write_enabled_metric 1
echo "backup: scheduled '${SCHEDULE}' (UTC) for env=${ENV_NAME} -> ${BACKUP_DEST}"
exec crond -f -l 8
