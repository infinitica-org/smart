# S6-VV-97 — backup runner: pg_dump (matches the pg16 server), age for
# encryption, rclone for MinIO reads and off-box uploads. See
# docs/delivery/BACKUP_RESTORE.md.
FROM alpine:3.20

RUN apk add --no-cache bash coreutils ca-certificates tzdata postgresql16-client age rclone

# All rclone remotes come from RCLONE_CONFIG_* env vars; an empty config file
# silences the missing-config notice.
ENV RCLONE_CONFIG=/etc/rclone.conf
RUN touch /etc/rclone.conf

COPY entrypoint.sh backup.sh /usr/local/bin/
# Strip CR in case the build context came from a Windows checkout (core.autocrlf).
RUN sed -i 's/\r$//' /usr/local/bin/*.sh && chmod +x /usr/local/bin/*.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
