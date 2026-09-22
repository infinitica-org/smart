'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import type { TenantEntitlementsDto } from '@smart/contracts';
import { api, employersApi } from '../../lib/api';
import {
  imageFileToDataUrl,
  SCHOOL_BANNER_MAX_BYTES,
  SCHOOL_LOGO_MAX_BYTES,
  validateSchoolImageFile,
} from '../../lib/school-profile-media';
import {
  buildSchoolPublicProfile,
  emptyStoredFromEntitlements,
  overridesFromStored,
} from '../../lib/school-public-profile';
import {
  loadSchoolPublicProfile,
  saveSchoolPublicProfile,
  type StoredSchoolProfile,
} from '../../lib/tpo-institution-settings';
import {
  bentoPageStackClass,
  dashboardErrorNoticeClass,
  dashboardPrimaryButtonClass,
  dashboardSuccessNoticeClass,
} from '../../lib/tpo-dashboard-ui';
import { inputClass, labelClass } from '../../lib/tpo-ui';
import { SchoolProfileCard } from './SchoolProfileCard';

export function SchoolProfileWorkspace() {
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<TenantEntitlementsDto | null>(null);
  const [form, setForm] = useState<StoredSchoolProfile>(() => emptyStoredFromEntitlements(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [employersRecruitingCount, setEmployersRecruitingCount] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const persist = useCallback(
    (next: StoredSchoolProfile) => {
      setForm(next);
      if (institutionId) saveSchoolPublicProfile(institutionId, next);
    },
    [institutionId],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, ent, employerRes] = await Promise.all([
        api.auth.me(),
        api.onboarding.tpoEntitlements(),
        employersApi.list().catch(() => ({ employers: [] })),
      ]);
      const recruiting = employerRes.employers.filter((e) => e.activeOpeningCount > 0).length;
      setEmployersRecruitingCount(recruiting);
      const inst = me.institutionId ?? null;
      setInstitutionId(inst);
      setEntitlements(ent);
      const defaults = emptyStoredFromEntitlements(ent);
      if (inst) {
        const saved = loadSchoolPublicProfile(inst);
        setForm(saved ? { ...defaults, ...saved } : defaults);
      } else {
        setForm(defaults);
      }
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Failed to load school profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const previewProfile = useMemo(() => {
    if (!entitlements) return null;
    return buildSchoolPublicProfile(entitlements, overridesFromStored(form));
  }, [entitlements, form]);

  async function handleImage(file: File, kind: 'logo' | 'banner'): Promise<void> {
    const maxBytes = kind === 'logo' ? SCHOOL_LOGO_MAX_BYTES : SCHOOL_BANNER_MAX_BYTES;
    const validationError = validateSchoolImageFile(file, maxBytes);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (kind === 'logo') setUploadingLogo(true);
    else setUploadingBanner(true);
    try {
      const dataUrl = await imageFileToDataUrl(
        file,
        kind === 'logo' ? 400 : 1600,
        kind === 'logo' ? 400 : 480,
      );
      persist({
        ...form,
        [kind === 'logo' ? 'logoDataUrl' : 'bannerDataUrl']: dataUrl,
      });
      setNotice(kind === 'logo' ? 'Logo updated.' : 'Banner updated.');
    } catch {
      setError('Could not process that image. Try a JPEG or PNG under the size limit.');
    } finally {
      setUploadingLogo(false);
      setUploadingBanner(false);
    }
  }

  function handleSaveAbout() {
    persist(form);
    setNotice('School profile saved.');
  }

  return (
    <div className={`${bentoPageStackClass} max-w-[880px]`}>
      {error ? <div className={dashboardErrorNoticeClass}>{error}</div> : null}
      {notice ? <div className={dashboardSuccessNoticeClass}>{notice}</div> : null}

      {loading || !previewProfile ? (
        <p className="text-[13px] text-[var(--ds-text-muted)]">Loading school profile…</p>
      ) : (
        <>
          <SchoolProfileCard
            profile={previewProfile}
            logoUrl={form.logoDataUrl || null}
            bannerUrl={form.bannerDataUrl || null}
            employersRecruitingCount={employersRecruitingCount}
            placementRatePercent={null}
            uploadingLogo={uploadingLogo}
            uploadingBanner={uploadingBanner}
            onPickLogo={(file) => void handleImage(file, 'logo')}
            onPickBanner={(file) => void handleImage(file, 'banner')}
          />

          <section className="space-y-3 pt-1">
            <div>
              <label className={labelClass} htmlFor="school-about">
                About
              </label>
              <textarea
                id="school-about"
                className={`${inputClass} min-h-[100px] resize-y py-2`}
                value={form.about}
                onChange={(e) => setForm((prev) => ({ ...prev, about: e.target.value }))}
                maxLength={2000}
              />
            </div>
            <button type="button" onClick={handleSaveAbout} className={dashboardPrimaryButtonClass}>
              Save
            </button>
          </section>
        </>
      )}
    </div>
  );
}
