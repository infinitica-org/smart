-- INF-07 follow-up: normalize organizations.domain to a bare hostname.
--
-- The original INF-07 backfill copied companies.website verbatim into
-- organizations.domain (instead of extracting the hostname), and
-- CompaniesService.createCompany had the same bug at runtime. A polluted
-- value like "https://acme.com" breaks downstream domain matching (e.g.
-- WE-T03 manager-endorsement), which reconstructs `https://${org.domain}`
-- and ends up with a malformed double-scheme URL that never matches any
-- real verifier email domain.

WITH normalized AS (
    SELECT
        id,
        regexp_replace(
            regexp_replace(
                regexp_replace(lower(trim("domain")), '^[a-z][a-z0-9+.-]*://', ''),
                '[/:?#].*$', ''
            ),
            '^www\.', ''
        ) AS clean_domain
    FROM "organizations"
    WHERE "domain" IS NOT NULL
      AND "domain" ~ '(://|/|^www\.)'
),
-- Only apply the normalized value where it does not collide with another
-- organization's existing domain — merging duplicate orgs (reassigning their
-- companies/work_experiences) is out of scope for this repair.
safe_updates AS (
    SELECT n.id, n.clean_domain
    FROM normalized n
    WHERE n.clean_domain <> ''
      AND NOT EXISTS (
          SELECT 1 FROM "organizations" o
          WHERE o."domain" = n.clean_domain AND o."id" <> n."id"
      )
)
UPDATE "organizations" o
SET "domain" = s.clean_domain
FROM safe_updates s
WHERE o."id" = s."id";

-- Any remaining polluted domain (either empty after stripping, or its
-- normalized form collided with an existing organization) is nulled out
-- rather than left as a value that would silently fail domain matching
-- forever.
UPDATE "organizations"
SET "domain" = NULL
WHERE "domain" IS NOT NULL
  AND "domain" ~ '(://|/|^www\.)';
