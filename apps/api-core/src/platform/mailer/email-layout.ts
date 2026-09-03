export type EmailTone = 'brand' | 'success' | 'warning' | 'danger' | 'info';
export type EmailBadgeTone = 'success' | 'warning' | 'danger' | 'info';

// A small, consistent illustration system: one line-icon per email "type",
// tinted with the same tone used for that template's status badge (where it
// has one) so the icon and the badge always agree with each other.
export type EmailIconName =
  | 'briefcase'
  | 'sparkles'
  | 'bell'
  | 'star'
  | 'trendingUp'
  | 'checkCircle'
  | 'refresh'
  | 'lock';

export interface EmailLayoutOptions {
  readonly previewText: string;
  readonly heading: string;
  readonly bodyHtml: string;
  readonly cta?: { readonly label: string; readonly url: string };
  readonly icon?: { readonly name: EmailIconName; readonly tone: EmailTone };
  /** A larger centered hero graphic for a template's own header; takes priority over `icon` when both are set. */
  readonly illustration?: string;
  readonly badge?: { readonly label: string; readonly tone: EmailBadgeTone };
  readonly footerNote?: string;
  readonly signoff?: string;
}

const BRAND = {
  name: 'SMART Platform',
  supportEmail: 'support@smart.local',
} as const;

// Brand tokens mirrored from packages/config-tailwind/theme.css so transactional
// email stays visually consistent with the product (single teal accent, warm
// paper canvas, rounded card — see that file's "Soft / minimal" design notes).
const TOKENS = {
  ink: '#1c1c1e',
  paper: '#faf9f7',
  teal: '#2fbfae',
  tealDeep: '#0f5c63',
  gray600: '#726f6a',
} as const;

const TONE: Record<EmailTone, { fg: string; bg: string }> = {
  brand: { fg: TOKENS.tealDeep, bg: '#eefaf7' },
  success: { fg: '#1f9d55', bg: '#eafaf0' },
  warning: { fg: '#d97706', bg: '#fef6e7' },
  danger: { fg: '#dc2626', bg: '#fdecec' },
  info: { fg: TOKENS.teal, bg: '#eefaf7' },
};

// packages/ui/src/assets/brand/mark-coloured.svg, flattened to a single fill so
// it stays legible without the gradient defs some email clients strip.
const BRAND_MARK = `<svg width="18" height="19" viewBox="0 0 202.67 211.56" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SMART">
<path fill="${TOKENS.teal}" d="M138.45,73.34l-24.78,25.1c3.92,5.59,3.41,13.35-1.56,18.38-4.96,5.02-12.71,5.63-18.34,1.78l-35.17,35.63-35.29,35.79h48.38l11.43-11.57,30.73-31.18,24.22-24.42,46.91,46.35v-49.9l-46.51-45.97ZM131.32,23.09l-11.43,11.57-30.72,31.18-24.22,24.42L18.03,43.9v49.89l46.51,45.97,25.11-25.44c-3.47-5.54-2.81-12.91,1.97-17.76,4.78-4.83,12.14-5.57,17.72-2.19l35.05-35.51,35.3-35.79h-48.38Z"/>
</svg>`;

// 24x24 line-icon glyphs (stroke-only, no fill) in a Feather/Lucide style —
// simple enough to hand-author reliably and to stay legible at ~26px.
const ICON_GLYPHS: Record<EmailIconName, string> = {
  briefcase:
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  sparkles:
    '<path d="M12 3v4M12 17v4M5 12H3m18 0h-2M7.8 7.8 6.3 6.3m11.4 11.4-1.5-1.5M7.8 16.2l-1.5 1.5m11.4-11.4-1.5 1.5"/><circle cx="12" cy="12" r="3"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 4.2 1.5 5.5 1.5 5.5h-15S6 12.2 6 8Z"/><path d="M10 18a2 2 0 0 0 4 0"/>',
  star: '<path d="m12 3 2.6 5.6 6.1.6-4.6 4.2 1.3 6-5.4-3.1L6.6 19.4l1.3-6L3.3 9.2l6.1-.6L12 3Z" stroke-linejoin="round"/>',
  trendingUp: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 6h6v6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.3 6.3M3 12a9 9 0 0 1 15.3-6.3"/><path d="M21 3v6h-6M3 21v-6h6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/>',
};

function iconBadge(icon: { name: EmailIconName; tone: EmailTone }): string {
  const palette = TONE[icon.tone];
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;"><tr>
    <td width="56" height="56" style="width:56px;height:56px;border-radius:16px;background:${palette.bg};text-align:center;vertical-align:middle;">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${palette.fg}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_GLYPHS[icon.name]}</svg>
    </td>
  </tr></table>`;
}

// Hand-drawn, brand-toned hero illustrations for specific templates — kept to
// simple flat shapes (no photorealistic paths) so they stay legible at small
// sizes and consistent with the rest of the brand's restrained visual language.
// An open envelope with a letter, a teal "verified" seal, and a couple of
// sparkle accents — used on the student welcome email.
export const WELCOME_ILLUSTRATION = `<svg width="200" height="142" viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="An open envelope with a letter">
  <path d="M30 76 L120 24 L210 76 Z" fill="#eefaf7" stroke="#0f5c63" stroke-width="3" stroke-linejoin="round"/>
  <rect x="30" y="76" width="180" height="104" rx="14" fill="#ffffff" stroke="#0f5c63" stroke-width="3"/>
  <path d="M30 76 L120 138 L210 76" fill="none" stroke="#0f5c63" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <g transform="rotate(-6 120 92)">
    <rect x="72" y="46" width="96" height="66" rx="8" fill="#ffffff" stroke="#1c1c1e" stroke-width="2.5"/>
    <line x1="88" y1="66" x2="152" y2="66" stroke="#cfccc6" stroke-width="4" stroke-linecap="round"/>
    <line x1="88" y1="80" x2="152" y2="80" stroke="#cfccc6" stroke-width="4" stroke-linecap="round"/>
    <line x1="88" y1="94" x2="128" y2="94" stroke="#cfccc6" stroke-width="4" stroke-linecap="round"/>
  </g>
  <circle cx="188" cy="132" r="18" fill="#2fbfae"/>
  <path d="M180 132 l5.5 5.5L197 125" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M46 46v10M41 51h10" stroke="#2fbfae" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M206 108v8M202 112h8" stroke="#2fbfae" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="26" cy="118" r="3.5" fill="#2fbfae"/>
</svg>`;

// A closed envelope with a small clock badge — "your invite is still waiting" —
// used on the invite-reminder email.
export const REMINDER_ILLUSTRATION = `<svg width="200" height="142" viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A closed envelope with a clock">
  <path d="M30 76 L120 24 L210 76 Z" fill="#eefaf7" stroke="#0f5c63" stroke-width="3" stroke-linejoin="round"/>
  <rect x="30" y="76" width="180" height="104" rx="14" fill="#ffffff" stroke="#0f5c63" stroke-width="3"/>
  <path d="M30 76 L120 138 L210 76" fill="none" stroke="#0f5c63" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="188" cy="132" r="20" fill="#2fbfae"/>
  <path d="M188 122v10l7 5" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M46 46v10M41 51h10" stroke="#2fbfae" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="26" cy="118" r="3.5" fill="#2fbfae"/>
</svg>`;

// A folder/clipboard with a checklist and a small chart badge — "manage your
// institution's placement pipeline" — used on the TPO/admin invite email.
export const ADMIN_ILLUSTRATION = `<svg width="200" height="142" viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A clipboard with a checklist">
  <rect x="100" y="28" width="40" height="18" rx="6" fill="#eefaf7" stroke="#0f5c63" stroke-width="3"/>
  <rect x="55" y="40" width="130" height="112" rx="12" fill="#ffffff" stroke="#0f5c63" stroke-width="3"/>
  <path d="M72 68 l6 6 l10-12" fill="none" stroke="#2fbfae" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="96" y1="70" x2="165" y2="70" stroke="#cfccc6" stroke-width="4" stroke-linecap="round"/>
  <path d="M72 96 l6 6 l10-12" fill="none" stroke="#2fbfae" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="96" y1="98" x2="165" y2="98" stroke="#cfccc6" stroke-width="4" stroke-linecap="round"/>
  <rect x="72" y="118" width="20" height="20" rx="5" fill="none" stroke="#cfccc6" stroke-width="3"/>
  <line x1="96" y1="126" x2="165" y2="126" stroke="#cfccc6" stroke-width="4" stroke-linecap="round"/>
  <circle cx="190" cy="134" r="20" fill="#2fbfae"/>
  <rect x="180" y="132" width="6" height="10" rx="1.5" fill="#ffffff"/>
  <rect x="188" y="126" width="6" height="16" rx="1.5" fill="#ffffff"/>
  <rect x="196" y="122" width="6" height="20" rx="1.5" fill="#ffffff"/>
</svg>`;

// A ribboned medal with a star — "you made the shortlist" — used on the
// opportunity-shortlisted email.
export const SHORTLISTED_ILLUSTRATION = `<svg width="200" height="142" viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A medal with a star">
  <path d="M95 95 L70 155 L100 145 L110 165 Z" fill="#2fbfae"/>
  <path d="M145 95 L170 155 L140 145 L130 165 Z" fill="#0f5c63"/>
  <circle cx="120" cy="85" r="48" fill="#ffffff" stroke="#0f5c63" stroke-width="3.5"/>
  <circle cx="120" cy="85" r="36" fill="#eefaf7" stroke="#2fbfae" stroke-width="2.5"/>
  <path d="m120 62 6.5 14 15.5 1.5-11.5 10.5 3.2 15-13.7-8-13.7 8 3.2-15-11.5-10.5 15.5-1.5Z" fill="#2fbfae" stroke-linejoin="round"/>
  <path d="M40 40v10M35 45h10" stroke="#2fbfae" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="205" cy="60" r="3.5" fill="#2fbfae"/>
</svg>`;

// An ascending step chart with a dashed trajectory and a checkmark marker at
// the peak — "your application just moved forward" — used on the
// application-stage-changed email.
export const STAGE_CHANGED_ILLUSTRATION = `<svg width="200" height="142" viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="An ascending progress chart">
  <rect x="30" y="130" width="45" height="20" rx="4" fill="#f1efec"/>
  <rect x="85" y="105" width="45" height="45" rx="4" fill="#f1efec"/>
  <rect x="140" y="75" width="45" height="75" rx="4" fill="#eefaf7" stroke="#2fbfae" stroke-width="2.5"/>
  <path d="M50 128 C70 100 95 100 110 90 C130 78 150 65 165 55" fill="none" stroke="#0f5c63" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 10"/>
  <circle cx="52" cy="128" r="6" fill="#0f5c63"/>
  <circle cx="168" cy="50" r="14" fill="#2fbfae"/>
  <path d="M162 50 l4 4 l8-9" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// A shield badge with a checkmark — "you're verified" — used on the
// verification-passed email (deliberately a different shape from the
// shortlisted medal, since the two celebratory emails shouldn't look alike).
export const VERIFICATION_PASSED_ILLUSTRATION = `<svg width="200" height="142" viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A shield with a checkmark">
  <path d="M120 20 L175 40 V90 C175 125 150 150 120 160 C90 150 65 125 65 90 V40 Z" fill="#ffffff" stroke="#0f5c63" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M120 32 L163 48 V90 C163 118 143 138 120 147 C97 138 77 118 77 90 V48 Z" fill="#eafaf0" stroke="#1f9d55" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M98 92 l16 16 l30-34" fill="none" stroke="#1f9d55" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M40 50v10M35 55h10" stroke="#1f9d55" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="200" cy="70" r="3.5" fill="#1f9d55"/>
</svg>`;

// A target with an arrow landed just outside the bullseye — "close, but not
// quite this time" — a deliberately non-punitive image for the
// verification-failed email (no red X).
export const VERIFICATION_FAILED_ILLUSTRATION = `<svg width="200" height="142" viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A target with an arrow near the center">
  <circle cx="115" cy="90" r="60" fill="#ffffff" stroke="#dc2626" stroke-width="3"/>
  <circle cx="115" cy="90" r="42" fill="#fdecec" stroke="#dc2626" stroke-width="2.5"/>
  <circle cx="115" cy="90" r="22" fill="#ffffff" stroke="#dc2626" stroke-width="2.5"/>
  <circle cx="115" cy="90" r="6" fill="#dc2626"/>
  <line x1="205" y1="35" x2="150" y2="75" stroke="#1c1c1e" stroke-width="3" stroke-linecap="round"/>
  <path d="M150 75 l-16 4 6-15Z" fill="#1c1c1e"/>
  <path d="M188 40 l14-10M198 52 l16-4" stroke="#1c1c1e" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

// A padlock with a small clock inset — "this is temporary, not a strike" —
// used on the verification-locked email.
export const VERIFICATION_LOCKED_ILLUSTRATION = `<svg width="200" height="142" viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A padlock with a clock">
  <rect x="70" y="80" width="100" height="80" rx="14" fill="#ffffff" stroke="#0f5c63" stroke-width="3.5"/>
  <path d="M90 80V56a30 30 0 0 1 60 0v24" fill="none" stroke="#0f5c63" stroke-width="6" stroke-linecap="round"/>
  <circle cx="120" cy="118" r="14" fill="#fef6e7" stroke="#d97706" stroke-width="2.5"/>
  <path d="M120 111v7l5 4" fill="none" stroke="#d97706" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M40 60v10M35 65h10" stroke="#d97706" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="195" cy="50" r="3.5" fill="#d97706"/>
</svg>`;

// A document with a magnifying glass over a checkmark — "please confirm this
// claim" — used on the work-experience verifier invite/reminder emails (sent
// to an external employer contact, so kept formal rather than playful).
export const WORK_EXPERIENCE_ILLUSTRATION = `<svg width="200" height="142" viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A document with a magnifying glass">
  <rect x="55" y="30" width="100" height="130" rx="10" fill="#ffffff" stroke="#0f5c63" stroke-width="3"/>
  <line x1="72" y1="55" x2="138" y2="55" stroke="#cfccc6" stroke-width="4" stroke-linecap="round"/>
  <line x1="72" y1="72" x2="138" y2="72" stroke="#cfccc6" stroke-width="4" stroke-linecap="round"/>
  <line x1="72" y1="89" x2="115" y2="89" stroke="#cfccc6" stroke-width="4" stroke-linecap="round"/>
  <circle cx="150" cy="120" r="34" fill="#eefaf7" stroke="#0f5c63" stroke-width="3"/>
  <line x1="174" y1="144" x2="194" y2="164" stroke="#0f5c63" stroke-width="6" stroke-linecap="round"/>
  <path d="M136 120 l10 10 l20-20" fill="none" stroke="#2fbfae" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function illustrationBlock(svg: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;"><tr>
    <td align="center">${svg}</td>
  </tr></table>`;
}

export function renderEmailLayout(options: EmailLayoutOptions): string {
  const icon = options.illustration
    ? illustrationBlock(options.illustration)
    : options.icon
      ? iconBadge(options.icon)
      : '';

  const badge = options.badge
    ? `<span style="display:inline-block;padding:5px 12px;border-radius:999px;font-size:11.5px;font-weight:600;color:${TONE[options.badge.tone].fg};background:${TONE[options.badge.tone].bg};margin-bottom:16px;">${options.badge.label}</span><br/>`
    : '';

  const ctaBlock = options.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:8px;">
        <tr><td>
          <a href="${options.cta.url}" style="display:inline-block;background:${TOKENS.teal};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 30px;border-radius:999px;">${options.cta.label}</a>
        </td></tr>
      </table>`
    : '';

  const footerNote = options.footerNote
    ? `<p style="margin:14px 0 0;color:${TOKENS.gray600};font-size:12.5px;line-height:1.6;">${options.footerNote}</p>`
    : '';

  const signoff = options.signoff
    ? `<p style="margin:22px 0 0;font-size:13.5px;line-height:1.6;color:${TOKENS.gray600};">${options.signoff}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${options.heading}</title>
</head>
<body style="margin:0;padding:0;background:${TOKENS.paper};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${TOKENS.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${options.previewText}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${TOKENS.paper};padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="padding-right:7px;vertical-align:middle;line-height:0;">${BRAND_MARK}</td>
                  <td style="vertical-align:middle;font-size:14px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:${TOKENS.tealDeep};">SMART</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:24px;padding:40px 40px 32px;">
              ${icon}
              ${badge}
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:700;color:${TOKENS.ink};letter-spacing:-0.01em;">${options.heading}</h1>
              ${options.bodyHtml}
              ${ctaBlock}
              ${footerNote}
              ${signoff}
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding:24px 16px 0;">
              <p style="margin:0;color:${TOKENS.gray600};font-size:12px;line-height:1.7;">${BRAND.name} &middot; <a href="mailto:${BRAND.supportEmail}" style="color:${TOKENS.gray600};">${BRAND.supportEmail}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 10px;color:#44403c;font-size:15px;line-height:1.65;">${text}</p>`;
}

export function strong(text: string): string {
  return `<strong style="color:${TOKENS.ink};">${text}</strong>`;
}

export function bulletList(items: readonly string[]): string {
  const rows = items
    .map(
      (item) =>
        `<li style="margin:0 0 8px;color:#44403c;font-size:15px;line-height:1.55;">${item}</li>`,
    )
    .join('');
  return `<ul style="margin:0 0 10px;padding-left:20px;">${rows}</ul>`;
}

export function detailRows(rows: readonly (readonly [string, string])[]): string {
  const tr = rows
    .map(
      ([label, value]) => `<tr>
        <td style="padding:6px 0;font-size:13px;color:${TOKENS.gray600};">${label}</td>
        <td align="right" style="padding:6px 0;font-size:13px;color:${TOKENS.ink};font-weight:600;">${value}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:14px 0 22px;">${tr}</table>`;
}
