# Bootstrap sign-off — Sprint 0 handover

> Every engineer completes this checklist once on a **fresh clone** before Sprint 1 work starts.
> Post proof in standup (screenshot or pasted terminal output).

## Steps

1. Clone and follow [`LOCAL_DEV.md`](./LOCAL_DEV.md) (§0–§3).
2. Run bootstrap:
   ```bash
   pnpm bootstrap
   # Windows without bash: manual sequence in LOCAL_DEV.md §3
   ```
3. Start dev servers:
   ```bash
   pnpm dev
   # or: pnpm dev:api in one terminal, pnpm dev:web in another
   ```
4. Run verification:
   ```bash
   ./scripts/verify-handover.sh
   ```
5. Confirm manually:
   - `GET http://localhost:3000/health` → 200
   - `GET http://localhost:3000/ready` → 200 (Postgres + Redis up)
   - `GET http://localhost:3000/api/v1/catalog/tracks` → **10 tracks**
   - Each portal loads: `:3001` student, `:3002` tpo, `:3003` admin, `:3004` verify

## Sign-off table

| Engineer                            | Date       | OS      | Bootstrap | verify-handover | Notes                                                          |
| ----------------------------------- | ---------- | ------- | --------- | --------------- | -------------------------------------------------------------- |
| Tino (`@brittytino`)                |            |         | ☐         | ☐               |                                                                |
| Vishal V (`@vis465`)                | 2026-08-22 | Windows | ☑         | ☑               | health/seed/build/test verified; team portal verify at kickoff |
| Satheswaran V (`@Satheshwaran26`)   |            |         | ☐         | ☐               |                                                                |
| Vishal Bharath R (`@vishalbharath`) |            |         | ☐         | ☐               |                                                                |
| Ramansh (`@Ram9012`)                |            |         | ☐         | ☐               |                                                                |
| Vedika G (`@11vedikaa`)             |            |         | ☐         | ☐               |                                                                |

When all six rows are checked, Sprint 0 exit criterion **“every engineer can run the full stack”** is met.
