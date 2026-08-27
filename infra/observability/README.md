# Local observability (obs profile)

Owner: Vishal V.

## Stack

| Service    | Host port | Purpose                        |
| ---------- | --------- | ------------------------------ |
| Prometheus | 9090      | Metrics scrape                 |
| Grafana    | 3100      | Dashboards (anon auth enabled) |
| Loki       | 3101      | Log store                      |
| Alloy      | —         | Docker log scrape → Loki       |

```bash
# From repo root — infra + apps + obs
pnpm infra:up
docker compose -f infra/docker/docker-compose.yml --profile apps --profile obs up -d
```

Grafana: http://localhost:3100 (admin / `smart` or anon).

Explore LogQL examples:

```logql
{service="api"} | json | correlationId="<uuid>"
{service="api"} | json | level="error"
```

Dashboard **SMART API logs** is provisioned with a `correlationId` textbox.

## Notes

- Alloy only sees containers in this Compose project. Host `pnpm dev:api` stdout is not scraped — use the `apps` profile API container, or paste JSON lines into Explore for local debugging.
- API must run with `LOG_PRETTY=false` (Compose default) so Loki receives JSON.
