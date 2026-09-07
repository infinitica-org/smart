# SMART email templates — design review

Three visual treatments (`classic`, `minimal`, `genz`) of all 8 transactional emails SMART
already sends, built from the same brand tokens as the product
(`packages/config-tailwind/theme.css`) and the same wordmark/mark SVGs
(`packages/ui/src/assets/brand/`).

**Status: static design-review build.** These are not wired into
`apps/api-core/src/platform/mailer/`. Once a theme (or per-theme set) is chosen, the
corresponding copy in `content.mjs` and layout in `layouts.mjs` should be ported into
`email-layout.ts` / `email-templates.ts` as the real render path.

## Layout

- `brand.mjs` — colors, fonts, and inline SVG logos, sourced from the design-system files above.
- `layouts.mjs` — one HTML-table-based renderer per theme (`renderClassic`, `renderMinimal`, `renderGenz`).
- `content.mjs` — sample data + per-theme copy for each of the 8 `EmailTemplateName`s
  (`apps/api-core/src/platform/mailer/mailer.types.ts`).
- `generate.mjs` — writes all 24 rendered emails to `preview/<theme>/<template>.html`.
- `build-gallery.mjs` — builds `gallery.html`, a single-file side-by-side viewer (published as
  an Artifact for review).

Regenerate after editing content/layout:

```bash
node email-templates/generate.mjs
node email-templates/build-gallery.mjs
```

## Theme intent

- **classic** — formal letterhead: sharp corners, bordered detail table, uppercase CTA, full
  legal footer with company address. Reads as an official institutional notice — closest fit if
  TPOs/institutions expect a traditional register.
- **minimal** — mirrors the live product's own theme (warm paper canvas, single teal accent,
  rounded card, pill button, generous whitespace). The safest default if you want the email to
  feel like a direct extension of the app.
- **genz** — bold rounded card, gradient hero using the brand mark's own teal gradient, pill CTA,
  casual-but-professional tone, sparing emoji. Aimed at the student audience without tipping into
  unprofessional.

Each of the 8 template types keeps identical sample data across its 3 variants, so the gallery is
an apples-to-apples comparison of presentation and tone, not different scenarios.

## Known limitations (by design, since this is a review build)

- **Fonts**: the product's brand fonts (Cabinet Grotesk / Axiforma) are proprietary and can't be
  loaded in email clients reliably, so every template falls back to a system sans-serif stack
  (`Helvetica Neue`/`Arial`) — this is standard practice for transactional email, not an oversight.
- **Logo**: inline SVG renders fine in the gallery/browsers and modern mail clients (Apple Mail,
  Gmail web/app), but Outlook desktop does not support inline SVG. Production wiring should host a
  PNG fallback of the wordmark and reference it by URL, or use `<!--[if mso]>` conditional markup.
- **Dark mode**: emails intentionally always render on a light card, matching how most email
  clients handle transactional mail — this mirrors the current production templates, which also
  don't attempt an email dark-mode variant.
