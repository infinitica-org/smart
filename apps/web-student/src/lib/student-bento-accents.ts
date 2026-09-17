/**
 * Rotating bento card accents — semantic tokens only (no raw hex, no gradients).
 * Used by profile entry cards across education, experience, certificates, etc.
 */

export const BENTO_PENDING_BADGE =
  'bg-[var(--student-warning-soft)] text-[var(--student-warning)] ring-1 ring-[var(--student-warning-border)]';

const blue = {
  marker: 'bg-[var(--student-blue)]',
  cardBorder: 'border-[var(--student-info-border)]',
  headerWash: 'bg-[var(--student-blue-soft)]',
  primaryTile: 'bg-[var(--student-blue-soft)] ring-1 ring-[var(--student-info-border)]',
  primaryIcon: 'text-[var(--student-info)]',
  primaryText: 'text-[var(--student-info)]',
  secondaryTile: 'bg-[var(--student-purple-soft)] ring-1 ring-[var(--student-purple)]/15',
  secondaryIcon: 'text-[var(--student-purple)]',
  secondaryText: 'text-[var(--student-purple)]',
  successTile: 'bg-[var(--student-success-soft)] ring-1 ring-[var(--student-success-border)]',
  successIcon: 'text-[var(--student-success)]',
  successText: 'text-[var(--student-success)]',
  warnTile: 'bg-[var(--student-warning-soft)] ring-1 ring-[var(--student-warning-border)]',
  warnIcon: 'text-[var(--student-warning)]',
};

const purple = {
  marker: 'bg-[var(--student-purple)]',
  cardBorder: 'border-[var(--student-purple)]/20',
  headerWash: 'bg-[var(--student-purple-soft)]',
  primaryTile: 'bg-[var(--student-purple-soft)] ring-1 ring-[var(--student-purple)]/15',
  primaryIcon: 'text-[var(--student-purple)]',
  primaryText: 'text-[var(--student-purple)]',
  secondaryTile: 'bg-[var(--student-blue-soft)] ring-1 ring-[var(--student-info-border)]',
  secondaryIcon: 'text-[var(--student-info)]',
  secondaryText: 'text-[var(--student-info)]',
  successTile: 'bg-[var(--student-accent-soft)] ring-1 ring-[var(--student-success-border)]',
  successIcon: 'text-[var(--student-accent)]',
  successText: 'text-[var(--student-accent)]',
  warnTile: 'bg-[var(--student-warning-soft)] ring-1 ring-[var(--student-warning-border)]',
  warnIcon: 'text-[var(--student-warning)]',
};

const teal = {
  marker: 'bg-[var(--student-accent)]',
  cardBorder: 'border-[var(--student-success-border)]',
  headerWash: 'bg-[var(--student-accent-soft)]',
  primaryTile: 'bg-[var(--student-accent-soft)] ring-1 ring-[var(--student-success-border)]',
  primaryIcon: 'text-[var(--student-accent)]',
  primaryText: 'text-[var(--student-accent)]',
  secondaryTile: 'bg-[var(--student-success-soft)] ring-1 ring-[var(--student-success-border)]',
  secondaryIcon: 'text-[var(--student-success)]',
  secondaryText: 'text-[var(--student-success)]',
  successTile: 'bg-[var(--student-success-soft)] ring-1 ring-[var(--student-success-border)]',
  successIcon: 'text-[var(--student-success)]',
  successText: 'text-[var(--student-success)]',
  warnTile: 'bg-[var(--student-warning-soft)] ring-1 ring-[var(--student-warning-border)]',
  warnIcon: 'text-[var(--student-warning)]',
};

const accents = [blue, purple, teal] as const;

type AccentTriple<T> = readonly [T, T, T];

function toAccentTriple<T>(rows: T[]): AccentTriple<T> {
  const [first, second, third] = rows;
  if (first === undefined || second === undefined || third === undefined) {
    throw new Error('Expected exactly three bento accent palettes');
  }
  return [first, second, third];
}

export function certificateCardAccents() {
  return accents.map((a) => ({
    marker: a.marker,
    cardBorder: a.cardBorder,
    headerWash: a.headerWash,
    issuedTile: a.primaryTile,
    issuedIcon: a.primaryIcon,
    expiryTile: a.warnTile,
    expiryIcon: a.warnIcon,
    skillsTile: a.secondaryTile,
    skillsIcon: a.secondaryIcon,
    proofTile: a.successTile,
    proofIcon: a.successIcon,
    pendingBadge: BENTO_PENDING_BADGE,
  }));
}

export type CertificateCardAccent = ReturnType<typeof certificateCardAccents>[number];

export const CERTIFICATE_CARD_ACCENTS = toAccentTriple(certificateCardAccents());

export const EDUCATION_CARD_ACCENTS = toAccentTriple(
  accents.map((a) => ({
    marker: a.marker,
    cardBorder: a.cardBorder,
    headerWash: a.headerWash,
    durationTile: a.primaryTile,
    durationIcon: a.primaryIcon,
    resultTile: a.secondaryTile,
    resultIcon: a.secondaryIcon,
    scoreTile: a.successTile,
    scoreText: a.successText,
    docsTile: a.primaryTile,
    docsIcon: a.primaryIcon,
    pendingBadge: BENTO_PENDING_BADGE,
  })),
);

export const LANGUAGE_CARD_ACCENTS = toAccentTriple(
  accents.map((a) => ({
    marker: a.marker,
    cardBorder: a.cardBorder,
    headerWash: a.headerWash,
    levelTile: a.primaryTile,
    levelIcon: a.primaryIcon,
    levelText: a.primaryText,
  })),
);

export const WORK_EXPERIENCE_CARD_ACCENTS = toAccentTriple(
  accents.map((a) => ({
    marker: a.marker,
    cardBorder: a.cardBorder,
    headerWash: a.headerWash,
    durationTile: a.primaryTile,
    durationIcon: a.primaryIcon,
    employmentTile: a.secondaryTile,
    employmentIcon: a.secondaryIcon,
    docsTile: a.primaryTile,
    docsIcon: a.primaryIcon,
    statusTile: a.successTile,
    statusText: a.successText,
  })),
);

/** Stable accent for list cards (always one of three palettes). */
export function pickBentoAccent<T>(accents: AccentTriple<T>, index: number): T {
  const slot = ((index % 3) + 3) % 3;
  if (slot === 1) return accents[1];
  if (slot === 2) return accents[2];
  return accents[0];
}
