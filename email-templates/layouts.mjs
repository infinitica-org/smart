import { BRAND, TOKENS, WORDMARK_COLOURED, WORDMARK_WHITE, MARK_COLOURED } from './brand.mjs';

const TONE_COLORS = {
  success: { fg: TOKENS.success, bg: TOKENS.successSoft },
  warning: { fg: TOKENS.warning, bg: TOKENS.warningSoft },
  danger: { fg: TOKENS.danger, bg: TOKENS.dangerSoft },
  info: { fg: TOKENS.teal, bg: TOKENS.tealSoft },
};

function preheader(text) {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${text}&#8203;&#847; </div>`;
}

function docShell({ title, bg, bodyInner }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="x-apple-disable-message-reformatting" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${bg};font-family:${TOKENS.font};color:${TOKENS.ink};">
${bodyInner}
</body>
</html>`;
}

/* ---------------------------------------------------------------------- */
/* CLASSIC — formal corporate letterhead: sharp corners, bordered detail   */
/* table, restrained single-column layout, full legal footer.              */
/* ---------------------------------------------------------------------- */
export function renderClassic(o) {
  const infoTable = o.infoRows
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${TOKENS.gray200};border-radius:6px;margin:20px 0 24px;">
        ${o.infoRows
          .map(
            ([label, value], i) => `<tr>
            <td style="padding:12px 16px;font-size:13px;color:${TOKENS.gray600};border-top:${i === 0 ? '0' : `1px solid ${TOKENS.gray200}`};width:38%;">${label}</td>
            <td style="padding:12px 16px;font-size:13px;color:${TOKENS.ink};font-weight:600;border-top:${i === 0 ? '0' : `1px solid ${TOKENS.gray200}`};border-left:1px solid ${TOKENS.gray200};">${value}</td>
          </tr>`,
          )
          .join('')}
      </table>`
    : '';

  const badge = o.badge
    ? `<span style="display:inline-block;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${TONE_COLORS[o.badge.tone].fg};background:${TONE_COLORS[o.badge.tone].bg};border:1px solid ${TONE_COLORS[o.badge.tone].fg}33;margin-bottom:14px;">${o.badge.label}</span><br/>`
    : '';

  const footerNote = o.footerNote
    ? `<p style="margin:16px 0 0;color:${TOKENS.gray600};font-size:12px;line-height:1.6;">${o.footerNote}</p>`
    : '';

  const bodyInner = `${preheader(o.previewText)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${TOKENS.gray100};padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid ${TOKENS.gray200};border-radius:6px;">
      <tr>
        <td style="padding:28px 36px;border-bottom:1px solid ${TOKENS.gray200};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width:132px;">${WORDMARK_COLOURED.replace('<svg ', '<svg width="132" height="36" style="display:block;" ')}</td>
              <td align="right" style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${TOKENS.gray600};">Official Notice</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:36px;">
          ${badge}
          <h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;font-weight:700;color:${TOKENS.ink};font-family:${TOKENS.fontHeading};">${o.heading}</h1>
          <p style="margin:0 0 12px;font-size:14.5px;line-height:1.65;color:${TOKENS.ink};">${o.salutation}</p>
          ${o.paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:14.5px;line-height:1.65;color:#3a3a3c;">${p}</p>`).join('')}
          ${infoTable}
          ${
            o.cta
              ? `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="padding-top:8px;">
                  <a href="${o.cta.url}" style="display:inline-block;background:${TOKENS.tealDeep};color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.03em;text-transform:uppercase;line-height:1;padding:14px 26px;border-radius:4px;">${o.cta.label}</a>
                </td></tr></table>`
              : ''
          }
          ${footerNote}
          <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:${TOKENS.gray600};">Regards,<br/>The ${BRAND.name} Team</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 36px;border-top:1px solid ${TOKENS.gray200};background:${TOKENS.gray100};border-radius:0 0 6px 6px;">
          <p style="margin:0 0 4px;color:${TOKENS.gray600};font-size:11.5px;line-height:1.6;">${BRAND.company} &middot; ${BRAND.address}</p>
          <p style="margin:0;color:${TOKENS.gray600};font-size:11.5px;line-height:1.6;">This is a system-generated message from ${BRAND.fullName}. Please do not reply directly. Questions &rarr; <a href="mailto:${BRAND.supportEmail}" style="color:${TOKENS.tealDeep};">${BRAND.supportEmail}</a></p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>`;

  return docShell({ title: o.heading, bg: TOKENS.gray100, bodyInner });
}

/* ---------------------------------------------------------------------- */
/* MINIMAL — mirrors the live product theme: warm paper canvas, single    */
/* teal accent, generous whitespace, rounded card, pill button.            */
/* ---------------------------------------------------------------------- */
export function renderMinimal(o) {
  const infoRows = o.infoRows
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;">
        ${o.infoRows
          .map(
            ([label, value]) => `<tr>
            <td style="padding:6px 0;font-size:13px;color:${TOKENS.gray600};">${label}</td>
            <td align="right" style="padding:6px 0;font-size:13px;color:${TOKENS.ink};font-weight:600;">${value}</td>
          </tr>`,
          )
          .join('')}
      </table>`
    : '';

  const badge = o.badge
    ? `<span style="display:inline-block;padding:5px 12px;border-radius:999px;font-size:11.5px;font-weight:600;color:${TONE_COLORS[o.badge.tone].fg};background:${TONE_COLORS[o.badge.tone].bg};margin-bottom:16px;">${o.badge.label}</span><br/>`
    : '';

  const footerNote = o.footerNote
    ? `<p style="margin:14px 0 0;color:${TOKENS.gray600};font-size:12.5px;line-height:1.6;">${o.footerNote}</p>`
    : '';

  const signoff = o.signoff
    ? `<p style="margin:22px 0 0;font-size:13.5px;line-height:1.6;color:${TOKENS.gray600};">${o.signoff}</p>`
    : '';

  const bodyInner = `${preheader(o.previewText)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${TOKENS.paper};padding:48px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
      <tr>
        <td align="center" style="padding-bottom:28px;">${MARK_COLOURED.replace('<svg ', '<svg width="30" height="31" style="display:block;" ')}</td>
      </tr>
      <tr>
        <td style="background:#ffffff;border-radius:24px;padding:40px 40px 32px;">
          ${badge}
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:700;color:${TOKENS.ink};font-family:${TOKENS.fontHeading};letter-spacing:-0.01em;">${o.heading}</h1>
          <p style="margin:0 0 10px;font-size:15px;line-height:1.65;color:${TOKENS.ink};">${o.salutation}</p>
          ${o.paragraphs.map((p) => `<p style="margin:0 0 10px;font-size:15px;line-height:1.65;color:#44403c;">${p}</p>`).join('')}
          ${infoRows}
          ${
            o.cta
              ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:8px;"><tr><td>
                  <a href="${o.cta.url}" style="display:inline-block;background:${TOKENS.teal};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 30px;border-radius:999px;">${o.cta.label}</a>
                </td></tr></table>`
              : ''
          }
          ${footerNote}
          ${signoff}
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:24px 16px 0;">
          <p style="margin:0;color:${TOKENS.gray600};font-size:12px;line-height:1.7;">${BRAND.fullName} &middot; <a href="mailto:${BRAND.supportEmail}" style="color:${TOKENS.gray600};">${BRAND.supportEmail}</a></p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>`;

  return docShell({ title: o.heading, bg: TOKENS.paper, bodyInner });
}

/* ---------------------------------------------------------------------- */
/* GENZ — bold rounded card, gradient hero (brand mark's own teal          */
/* gradient), pill CTA, casual-but-professional tone, emoji used sparingly.*/
/* ---------------------------------------------------------------------- */
export function renderGenz(o) {
  const infoChips = o.infoRows
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:4px 0 22px;"><tr>
        ${o.infoRows
          .map(
            ([label, value]) => `<td style="padding:0 8px 8px 0;">
              <span style="display:inline-block;background:${TOKENS.gray100};border-radius:12px;padding:8px 14px;font-size:12.5px;color:${TOKENS.ink};"><span style="color:${TOKENS.gray600};">${label}:</span> <strong>${value}</strong></span>
            </td>`,
          )
          .join('')}
      </tr></table>`
    : '';

  const badge = o.badge
    ? `<span style="display:inline-block;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;color:${TONE_COLORS[o.badge.tone].fg};background:${TONE_COLORS[o.badge.tone].bg};margin-bottom:16px;">${o.badge.label}</span><br/>`
    : '';

  const footerNote = o.footerNote
    ? `<p style="margin:14px 0 0;color:${TOKENS.gray600};font-size:12.5px;line-height:1.6;">${o.footerNote}</p>`
    : '';

  const bodyInner = `${preheader(o.previewText)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${TOKENS.paper};padding:36px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;background:#ffffff;border-radius:32px;overflow:hidden;box-shadow:0 8px 28px rgba(15,92,99,0.12);">
      <tr>
        <td style="background:linear-gradient(135deg,${TOKENS.gradFrom},${TOKENS.gradTo});padding:32px 36px 30px;">
          ${WORDMARK_WHITE.replace('<svg ', '<svg width="104" height="29" style="display:block;margin-bottom:18px;" ')}
          <div style="font-size:22px;line-height:1.35;font-weight:700;color:#ffffff;font-family:${TOKENS.fontHeading};letter-spacing:-0.01em;">${o.emoji ? `${o.emoji} ` : ''}${o.heading}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 36px 36px;">
          ${badge}
          <p style="margin:0 0 10px;font-size:15px;line-height:1.65;color:${TOKENS.ink};">${o.salutation}</p>
          ${o.paragraphs.map((p) => `<p style="margin:0 0 10px;font-size:15px;line-height:1.65;color:#44403c;">${p}</p>`).join('')}
          ${infoChips}
          ${
            o.cta
              ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:6px;"><tr><td>
                  <a href="${o.cta.url}" style="display:inline-block;background:${TOKENS.ink};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;line-height:1;padding:15px 32px;border-radius:999px;">${o.cta.label} &rarr;</a>
                </td></tr></table>`
              : ''
          }
          ${footerNote}
          <p style="margin:26px 0 0;font-size:13.5px;line-height:1.6;color:${TOKENS.gray600};">&mdash; Team ${BRAND.name} &#10024;</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;">
      <tr><td align="center" style="padding:20px 16px 0;">
        <p style="margin:0;color:${TOKENS.gray600};font-size:11.5px;line-height:1.7;">${BRAND.fullName} &middot; questions? <a href="mailto:${BRAND.supportEmail}" style="color:${TOKENS.gray600};">${BRAND.supportEmail}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>`;

  return docShell({ title: o.heading, bg: TOKENS.paper, bodyInner });
}

export const RENDERERS = { classic: renderClassic, minimal: renderMinimal, genz: renderGenz };
