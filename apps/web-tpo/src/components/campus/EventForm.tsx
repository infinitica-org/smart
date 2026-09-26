'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  detectTimeZone,
  listTimeZones,
  utcToZonedLocal,
  zonedLocalToUtcIso,
} from '@smart/ui';
import {
  CreateCareerEventSchema,
  type CareerEventAudience,
  type CareerEventDto,
  type CreateCareerEvent,
  type UpdateCareerEvent,
} from '@smart/contracts';
import { SmartApiError } from '@smart/api-client';

const AUDIENCE_LABEL: Record<CareerEventAudience, string> = {
  STUDENTS: 'Students only',
  EMPLOYERS: 'Employers only',
  BOTH: 'Students and employers',
};

interface FormState {
  title: string;
  description: string;
  startsLocal: string;
  endsLocal: string;
  timezone: string;
  location: string;
  onlineUrl: string;
  capacity: string;
  audience: CareerEventAudience;
  employerRegistration: boolean;
}

function initialState(event?: CareerEventDto): FormState {
  const timezone = event?.timezone ?? detectTimeZone();
  return {
    title: event?.title ?? '',
    description: event?.description ?? '',
    startsLocal: event ? utcToZonedLocal(event.startsAt, timezone) : '',
    endsLocal: event ? utcToZonedLocal(event.endsAt, timezone) : '',
    timezone,
    location: event?.location ?? '',
    onlineUrl: event?.onlineUrl ?? '',
    capacity: event?.capacity != null ? String(event.capacity) : '',
    audience: event?.audience ?? 'STUDENTS',
    employerRegistration: event?.employerRegistration ?? false,
  };
}

/** Field-level errors from a schema parse, keyed by the form's own field names. */
const FIELD_OF_PATH: Record<string, keyof FormState> = {
  startsAt: 'startsLocal',
  endsAt: 'endsLocal',
};

function fieldFor(path: string): string {
  return FIELD_OF_PATH[path] ?? path;
}

/**
 * Th6-448 / Th6-449 — create or edit an event. Times are typed in the chosen timezone and sent as UTC.
 * In edit mode only changed fields are sent, so touching the title never re-validates the start time.
 */
export function EventForm({
  event,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  event?: CareerEventDto;
  submitLabel: string;
  onSubmit: (body: CreateCareerEvent | UpdateCareerEvent) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(event));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const zones = useMemo(() => listTimeZones(), []);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function buildBody(): {
    body: CreateCareerEvent | UpdateCareerEvent | null;
    errors: Record<string, string>;
  } {
    const found: Record<string, string> = {};
    const startsAt = zonedLocalToUtcIso(form.startsLocal, form.timezone);
    const endsAt = zonedLocalToUtcIso(form.endsLocal, form.timezone);
    if (!startsAt) found.startsLocal = 'Choose a start date and time.';
    if (!endsAt) found.endsLocal = 'Choose an end date and time.';
    const capacity = form.capacity.trim() === '' ? null : Number(form.capacity);
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) {
      found.capacity = 'Capacity must be a whole number, at least 1.';
    }
    if (!event && startsAt && Date.parse(startsAt) <= Date.now()) {
      found.startsLocal = 'The event must start in the future.';
    }
    const candidate = {
      title: form.title,
      description: form.description,
      startsAt: startsAt ?? '',
      endsAt: endsAt ?? '',
      timezone: form.timezone,
      location: form.location.trim() || null,
      onlineUrl: form.onlineUrl.trim() || null,
      capacity,
      audience: form.audience,
      employerRegistration: form.employerRegistration,
    };
    const parsed = CreateCareerEventSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = fieldFor(String(issue.path[0] ?? 'title'));
        if (
          !(key in found) &&
          !(key === 'startsLocal' && !startsAt) &&
          !(key === 'endsLocal' && !endsAt)
        ) {
          found[key] = issue.message;
        }
      }
    }
    if (Object.keys(found).length > 0 || !parsed.success) return { body: null, errors: found };
    if (!event) return { body: parsed.data, errors: {} };

    const initial = event;
    const before = initialState(initial);
    const changed: UpdateCareerEvent = {};
    if (parsed.data.title !== initial.title) changed.title = parsed.data.title;
    if (parsed.data.description !== initial.description)
      changed.description = parsed.data.description;
    // Compare at the input's own precision: the stored instant has seconds the datetime-local field drops,
    // and resending an unchanged time would tell every registrant the event moved.
    const zoneChanged = parsed.data.timezone !== initial.timezone;
    if (zoneChanged || form.startsLocal !== before.startsLocal)
      changed.startsAt = parsed.data.startsAt;
    if (zoneChanged || form.endsLocal !== before.endsLocal) changed.endsAt = parsed.data.endsAt;
    if (parsed.data.timezone !== initial.timezone) changed.timezone = parsed.data.timezone;
    if ((parsed.data.location ?? null) !== initial.location)
      changed.location = parsed.data.location ?? null;
    if ((parsed.data.onlineUrl ?? null) !== initial.onlineUrl)
      changed.onlineUrl = parsed.data.onlineUrl ?? null;
    if ((parsed.data.capacity ?? null) !== initial.capacity)
      changed.capacity = parsed.data.capacity ?? null;
    if (parsed.data.audience !== initial.audience) changed.audience = parsed.data.audience;
    if (parsed.data.employerRegistration !== initial.employerRegistration) {
      changed.employerRegistration = parsed.data.employerRegistration;
    }
    return { body: changed, errors: {} };
  }

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    const { body, errors: found } = buildBody();
    setErrors(found);
    setFormError(null);
    if (!body) return;
    setSaving(true);
    try {
      await onSubmit(body);
    } catch (failure) {
      if (failure instanceof SmartApiError && Object.keys(failure.fieldErrors).length > 0) {
        const mapped: Record<string, string> = {};
        for (const [path, message] of Object.entries(failure.fieldErrors))
          mapped[fieldFor(path)] = message;
        setErrors(mapped);
      }
      setFormError(
        failure instanceof Error && failure.message ? failure.message : 'Could not save the event.',
      );
    } finally {
      setSaving(false);
    }
  }

  const input = 'mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal';
  const err = (key: string) =>
    errors[key] ? (
      <span role="alert" className="mt-1 block text-xs font-normal text-red-600">
        {errors[key]}
      </span>
    ) : null;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <label className="block text-xs font-semibold">
        Title
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className={input}
          maxLength={200}
          aria-invalid={!!errors.title}
        />
        {err('title')}
      </label>
      <label className="block text-xs font-semibold">
        Description
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          className={input}
        />
        {err('description')}
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-xs font-semibold">
          Timezone
          <select
            value={form.timezone}
            onChange={(e) => set('timezone', e.target.value)}
            className={input}
          >
            {zones.includes(form.timezone) ? null : (
              <option value={form.timezone}>{form.timezone}</option>
            )}
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          {err('timezone')}
        </label>
        <label className="block text-xs font-semibold">
          Starts
          <input
            type="datetime-local"
            value={form.startsLocal}
            onChange={(e) => set('startsLocal', e.target.value)}
            className={input}
            aria-invalid={!!errors.startsLocal}
          />
          {err('startsLocal')}
        </label>
        <label className="block text-xs font-semibold">
          Ends
          <input
            type="datetime-local"
            value={form.endsLocal}
            onChange={(e) => set('endsLocal', e.target.value)}
            className={input}
            aria-invalid={!!errors.endsLocal}
          />
          {err('endsLocal')}
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold">
          Location
          <input
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            className={input}
            placeholder="e.g. Main auditorium"
            aria-invalid={!!errors.location}
          />
          {err('location')}
        </label>
        <label className="block text-xs font-semibold">
          Online link
          <input
            value={form.onlineUrl}
            onChange={(e) => set('onlineUrl', e.target.value)}
            className={input}
            placeholder="https://"
            aria-invalid={!!errors.onlineUrl}
          />
          {err('onlineUrl')}
        </label>
      </div>
      <p className="text-xs text-zinc-500">Give a location, an online link, or both.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold">
          Audience
          <select
            value={form.audience}
            onChange={(e) => set('audience', e.target.value as CareerEventAudience)}
            className={input}
          >
            {(Object.keys(AUDIENCE_LABEL) as CareerEventAudience[]).map((value) => (
              <option key={value} value={value}>
                {AUDIENCE_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold">
          Capacity (optional)
          <input
            inputMode="numeric"
            value={form.capacity}
            onChange={(e) => set('capacity', e.target.value.replace(/\D/g, ''))}
            className={input}
            placeholder="No limit"
            aria-invalid={!!errors.capacity}
          />
          {err('capacity')}
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.employerRegistration}
          onChange={(e) => set('employerRegistration', e.target.checked)}
        />
        Let approved employers register for this event
      </label>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
