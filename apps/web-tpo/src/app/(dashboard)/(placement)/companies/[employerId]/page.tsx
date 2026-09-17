'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { PlacementEmployerDetail } from '@smart/contracts';
import { employersApi } from '../../../../../lib/api';
import { tpoApiErrorMessage } from '../../../../../lib/api-errors';
import {
  bentoPageStackClass,
  dashboardErrorNoticeClass,
} from '../../../../../lib/tpo-dashboard-ui';
import { cardClass, mutedTextClass, sectionTitleClass } from '../../../../../lib/tpo-ui';
import { JobOpeningIdLabel } from '../../../../../components/placement/JobOpeningIdLabel';
import { PlacementPageHeader } from '../../../../../components/placement/PlacementPageHeader';

export default function CompanyProfilePage() {
  const params = useParams();
  const employerId = typeof params.employerId === 'string' ? params.employerId : '';
  const [detail, setDetail] = useState<PlacementEmployerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employerId) return;
    setLoading(true);
    employersApi
      .get(employerId)
      .then(setDetail)
      .catch((caught) => setError(tpoApiErrorMessage(caught, 'Could not load company.')))
      .finally(() => setLoading(false));
  }, [employerId]);

  return (
    <div className={bentoPageStackClass}>
      <PlacementPageHeader
        eyebrow="Company"
        title={detail?.name ?? 'Company profile'}
        description="Employer profile, placement drive history, and current openings from your institution data."
        actions={
          <Link
            href="/companies"
            className="text-sm font-semibold text-[var(--ds-link)] hover:underline"
          >
            ← Companies
          </Link>
        }
      />
      {error ? <div className={dashboardErrorNoticeClass}>{error}</div> : null}
      {loading ? <p className={`text-sm ${mutedTextClass}`}>Loading…</p> : null}
      {detail ? (
        <div className="grid gap-4">
          <section className={cardClass}>
            <h2 className={sectionTitleClass}>About the company</h2>
            <p className={`mt-2 text-sm whitespace-pre-wrap ${mutedTextClass}`}>
              {detail.aboutCompany?.trim() || 'No description recorded yet.'}
            </p>
          </section>
          <section className={cardClass}>
            <h2 className={sectionTitleClass}>Previous placement drives</h2>
            {detail.driveHistory.length === 0 ? (
              <p className={`mt-2 text-sm ${mutedTextClass}`}>
                No previous placement drives recorded yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {detail.driveHistory.map((drive) => (
                  <li
                    key={drive.openingId}
                    className="rounded-lg border border-[var(--ds-border-subtle)] p-3"
                  >
                    <p className="font-semibold text-[var(--ds-text)]">{drive.roleTitle}</p>
                    <p className={`text-xs ${mutedTextClass}`}>
                      {drive.applicationCount} applications · {drive.shortlistedCount} shortlisted ·{' '}
                      {drive.selectedCount} hired/offered
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={cardClass}>
            <h2 className={sectionTitleClass}>Current openings</h2>
            {detail.currentOpenings.length === 0 ? (
              <p className={`mt-2 text-sm ${mutedTextClass}`}>No open postings for this company.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {detail.currentOpenings.map((opening) => (
                  <li
                    key={opening.openingId}
                    className="rounded-lg border border-[var(--ds-border-subtle)] p-3"
                  >
                    <p className="font-semibold text-[var(--ds-text)]">{opening.roleTitle}</p>
                    <p className={`text-xs ${mutedTextClass}`}>
                      {opening.status} · {opening.location}
                    </p>
                    <JobOpeningIdLabel openingId={opening.openingId} className="mt-2" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
