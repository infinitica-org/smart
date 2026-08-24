# SMART Trust & Verification Portal (`web-verify`)

This is the public-facing, anonymous lookup and verification portal for SMART certificates. It requires no authentication and is optimized for speed (< 80 ms target) and platform trust.

## Routing Schema

| Route Path | Type | Dynamic Parameters | Purpose / Backing Action |
|---|---|---|---|
| `/` | Static | None | Search landing page displaying Certificate ID UUID search lookup form. |
| `/cert/[id]` | Dynamic | `id`: UUID of Certificate | Cryptographically verified Certificate viewer disclosing the certified Level progress, methodology confidence note, calibration panelists, and headline Tier metal. |

## Layout Structure

* **Root Layout (`src/app/layout.tsx`)**: Integrates the **Public Chrome Layout**. Renders the generic trust logo header and signed verification info footers. Dark-theme default.
* **UI Primitives**: Extends design variables and layouts by consuming `@smart/ui` components locally (`Button`, `Card`, `TierBadge`, `LevelStepper`, `Input`, `Alert`) with zero direct dependencies.
