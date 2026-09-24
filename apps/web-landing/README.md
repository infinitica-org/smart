# @smart/web-landing

Public marketing / landing site (no auth). Owner: Satheswaran V.

## Local dev

```powershell
pnpm --filter @smart/web-landing dev
```

Open http://localhost:3007

Included in `pnpm dev:web` (`@smart/web-*`).

## Adding your SMART_Landing_Page code

1. In OneDrive, right-click `SMART_Landing_Page` → **Always keep on this device** (files must exist on disk).
2. Copy the project into this app:

   ```powershell
   Copy-Item -Recurse -Force `
     "C:\Users\sathe\OneDrive\Desktop\Smart Landing page\SMART_Landing_Page\*" `
     "F:\smart\smart\apps\web-landing\_import\"
   ```

3. Move React/TSX sections into `src/components/landing/` and wire them from `src/app/page.tsx`.
4. Put static assets under `public/landing/`.
5. Replace `@/` imports with `@/components/landing/...` as needed.

If the source is plain HTML, split into components or use a single `landing-page.tsx` with adapted markup and Tailwind classes.

Sign-in CTA should use `process.env.NEXT_PUBLIC_AUTH_URL` (default `http://localhost:3005/login`).
