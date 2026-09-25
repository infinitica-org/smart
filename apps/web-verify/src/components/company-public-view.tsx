import { COMPANY_EMPLOYEE_COUNT_LABELS, type CompanyProfile } from '@smart/contracts';
import { VerifiedBadge } from '@smart/ui';

const SOCIAL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X / Twitter',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

/** Public company page body (Th6-349). The badge shows only when the server says verified. */
export function CompanyPublicView({ profile }: { profile: CompanyProfile }) {
  const locations = [profile.headquarters, ...profile.additionalLocations].filter(
    (l): l is string => Boolean(l),
  );
  const facts = [
    profile.industry,
    profile.employeeCount
      ? `${COMPANY_EMPLOYEE_COUNT_LABELS[profile.employeeCount]} employees`
      : null,
  ].filter(Boolean);
  const socials = Object.entries(profile.socialLinks).filter(([, url]) => Boolean(url));

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6" aria-label={profile.displayName}>
      <header className="flex items-start gap-4">
        {profile.logoUrl ? (
          // Signed storage URL; next/image would need a remote pattern per bucket.
          <img
            src={profile.logoUrl}
            alt={`${profile.displayName} logo`}
            className="size-20 rounded-2xl border border-[var(--surface-border)] object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight">{profile.displayName}</h2>
            <VerifiedBadge verified={profile.isVerified} verifiedAt={profile.verifiedAt} />
          </div>
          {facts.length > 0 ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{facts.join(' · ')}</p>
          ) : null}
          {profile.website ? (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 block truncate text-sm font-medium underline"
            >
              {profile.website}
            </a>
          ) : null}
        </div>
      </header>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          About
        </h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
          {profile.about ?? 'This company has not added a description yet.'}
        </p>
      </section>

      {locations.length > 0 ? (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Locations
          </h3>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {locations.map((location, index) => (
              <li key={`${location}-${index}`}>
                {location}
                {index === 0 ? ' (headquarters)' : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.benefits.length > 0 ? (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Benefits
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {profile.benefits.map((benefit) => (
              <li
                key={benefit}
                className="rounded-full border border-[var(--surface-border)] px-3 py-1 text-xs"
              >
                {benefit}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {socials.length > 0 ? (
        <nav aria-label="Social links" className="flex flex-wrap gap-4 text-sm">
          {socials.map(([network, url]) => (
            <a
              key={network}
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="underline"
            >
              {SOCIAL_LABELS[network] ?? network}
            </a>
          ))}
        </nav>
      ) : null}
    </article>
  );
}
