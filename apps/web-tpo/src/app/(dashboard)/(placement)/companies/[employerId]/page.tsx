'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { PlacementEmployerDetail, PlacementRecordDto } from '@smart/contracts';
import { employersApi, placementOutcomesApi } from '../../../../../lib/api';
import { tpoApiErrorMessage } from '../../../../../lib/api-errors';
import { computeCompanyPlacementStats } from '../../../../../lib/company-placement-stats';
import {
  bentoPageStackClass,
  dashboardErrorNoticeClass,
} from '../../../../../lib/tpo-dashboard-ui';
import { cardClass, mutedTextClass, sectionTitleClass } from '../../../../../lib/tpo-ui';
import { JobOpeningIdLabel } from '../../../../../components/placement/JobOpeningIdLabel';
import { PlacementPageHeader } from '../../../../../components/placement/PlacementPageHeader';

function ctcLabel(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} LPA`;
}

export default function CompanyProfilePage() {
  const params = useParams();
  const employerId = typeof params.employerId === 'string' ? params.employerId : '';
  const [detail, setDetail] = useState<PlacementEmployerDetail | null>(null);
  const [outcomes, setOutcomes] = useState<PlacementRecordDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employerId) return;
    setLoading(true);
    employersApi
      .get(employerId)
      .then((employer) => {
        setDetail(employer);
        return placementOutcomesApi
          .listForCompany(employer.name)
          .then((res) => setOutcomes(res.records))
          .catch(() => setOutcomes([]));
      })
      .catch((caught) => setError(tpoApiErrorMessage(caught, 'Could not load company.')))
      .finally(() => setLoading(false));
  }, [employerId]);

  const stats = computeCompanyPlacementStats(outcomes);

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
            <h2 className={sectionTitleClass}>Placement outcomes</h2>
            <p className={`mt-1 text-sm ${mutedTextClass}`}>
              Recorded hires for this company — yearwise numbers and CTC range.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className={`text-xs ${mutedTextClass}`}>Total placed</dt>
                <dd className="mt-1 text-xl font-semibold text-[var(--ds-text)]">
                  {stats.totalPlaced}
                </dd>
              </div>
              <div>
                <dt className={`text-xs ${mutedTextClass}`}>Highest CTC ever</dt>
                <dd className="mt-1 text-xl font-semibold text-[var(--ds-text)]">
                  {ctcLabel(stats.highestCtc)}
                </dd>
              </div>
              <div>
                <dt className={`text-xs ${mutedTextClass}`}>Median CTC</dt>
                <dd className="mt-1 text-xl font-semibold text-[var(--ds-text)]">
                  {ctcLabel(stats.medianCtc)}
                </dd>
              </div>
              <div>
                <dt className={`text-xs ${mutedTextClass}`}>Lowest CTC</dt>
                <dd className="mt-1 text-xl font-semibold text-[var(--ds-text)]">
                  {ctcLabel(stats.lowestCtc)}
                </dd>
              </div>
            </dl>

            {stats.yearly.length === 0 ? (
              <p className={`mt-4 text-sm ${mutedTextClass}`}>
                No placement outcomes recorded yet — mark a candidate as Hired in the ATS to record
                one here.
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--ds-border-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
                      <th className="py-2 pr-4">Year</th>
                      <th className="py-2 pr-4">Placed</th>
                      <th className="py-2 pr-4">Highest CTC</th>
                      <th className="py-2 pr-4">Average CTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.yearly.map((row) => (
                      <tr
                        key={row.year}
                        className="border-b border-[var(--ds-border-subtle)] last:border-0"
                      >
                        <td className="py-2.5 pr-4 font-semibold text-[var(--ds-text)]">
                          {row.year}
                        </td>
                        <td className={`py-2.5 pr-4 ${mutedTextClass}`}>{row.placed}</td>
                        <td className={`py-2.5 pr-4 ${mutedTextClass}`}>
                          {ctcLabel(row.highestCtc)}
                        </td>
                        <td className={`py-2.5 pr-4 ${mutedTextClass}`}>
                          {row.averageCtc === null ? '—' : `${row.averageCtc.toFixed(1)} LPA`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
