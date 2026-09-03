export interface EmailLayoutOptions {
  readonly previewText: string;
  readonly heading: string;
  readonly accentColor: string;
  readonly accentSoftColor: string;
  readonly bodyHtml: string;
  readonly cta?: { readonly label: string; readonly url: string };
  readonly footerNote?: string;
}

const BRAND = {
  name: 'SMART Platform',
  supportEmail: 'support@smart.local',
} as const;

export function renderEmailLayout(options: EmailLayoutOptions): string {
  const ctaBlock = options.cta
    ? `<tr>
        <td style="padding: 28px 0 8px;">
          <a href="${options.cta.url}"
             style="display:inline-block;background:${options.accentColor};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 28px;border-radius:8px;">
            ${options.cta.label}
          </a>
        </td>
      </tr>`
    : '';

  const footerNote = options.footerNote
    ? `<p style="margin:16px 0 0;color:#64748b;font-size:13px;line-height:1.5;">${options.footerNote}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${options.heading}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${options.previewText}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:${options.accentColor};padding:24px 32px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.82);">${BRAND.name}</div>
              <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;color:#ffffff;">${options.heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="background:${options.accentSoftColor};border-left:4px solid ${options.accentColor};padding:16px 18px;border-radius:8px;margin-bottom:24px;">
                ${options.bodyHtml}
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0">${ctaBlock}</table>
              ${footerNote}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
                You are receiving this because your institution uses ${BRAND.name}.
                Questions? Contact <a href="mailto:${BRAND.supportEmail}" style="color:${options.accentColor};">${BRAND.supportEmail}</a>.
              </p>
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
  return `<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">${text}</p>`;
}

export function strong(text: string): string {
  return `<strong style="color:#0f172a;">${text}</strong>`;
}

export function bulletList(items: readonly string[]): string {
  const rows = items
    .map(
      (item) =>
        `<li style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.5;">${item}</li>`,
    )
    .join('');
  return `<ul style="margin:0;padding-left:20px;">${rows}</ul>`;
}
