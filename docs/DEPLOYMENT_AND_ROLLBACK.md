# Deployment & rollback runbook

## Branch strategy

This repository hosts multiple unrelated projects (see `README.md`
"Also in this repository"). Mutabasir uses the **`mutabasir/*`** branch
namespace to guarantee no collision with siblings such as
`beyond-style-*`, `couriers/*`, `lahza/*`.

**Canonical branch:** `mutabasir/director-lens-platform`
**Never** rebase onto `main` (which currently tracks a different
sibling project). See the warning block at the top of `README.md`.

## Vercel

The project is a Next.js 15 App Router app. Vercel auto-detects Next
and uses the defaults; no `vercel.json` overrides needed for build.

### Required environment variables

Set in Vercel → Project Settings → Environment Variables → Production
(and Preview, if you want previews to hit the real Supabase):

| Key | Purpose | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL | ✅ for real auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS-scoped) | ✅ for real auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side full-access key | Only for cron jobs / migrations |
| `NEXT_PUBLIC_APP_URL` | Absolute canonical URL for OG + sitemap | Recommended |
| `NEXT_PUBLIC_DEFAULT_THEME` | Fallback theme when the DB has none | Optional |
| `ANTHROPIC_API_KEY` | Reserved for the server-side LLM path (not yet used) | Optional |

**Do NOT set `DATABASE_URL` in Vercel.** It's only for the local
`npm run db:apply` migration script; putting it in Vercel exposes the
database password to server processes that don't need it.

### Deployment lifecycle

- **Preview:** every push to `mutabasir/*` gets a preview URL. Vercel
  UI shows the preview under the PR (or the branch dashboard).
- **Production:** promoting a preview to production is a manual step
  in the Vercel dashboard. This session does **not** deploy for you.

### First-run checklist (one-time)

1. Push the branch:
   `git push -u origin mutabasir/director-lens-platform`
2. In Vercel: Import the repo (or, if already imported, verify the
   project is scoped to this branch).
3. Set the four env vars above.
4. Apply the SQL schema locally (once):
   ```bash
   # DATABASE_URL in .env.local
   npm run db:apply
   ```
5. Trigger a redeploy.

### Every-push checklist

- Confirm `tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`
  all pass locally before pushing.
- The Vercel build already runs `next build`; it should mirror local.

## Health check

- `/api/health` returns `{ ok: true }` — plug into any uptime service.
- Vercel deploys expose the standard `/_vercel/insights` endpoint if
  Analytics is enabled.

## Rollback procedures

### Fast rollback via Vercel

1. Vercel dashboard → Deployments
2. Find the last-known-good deployment
3. Click "Promote to Production"

**Time to recover:** < 60 seconds.

### Git-level rollback

If a specific commit needs undoing:

```bash
git switch mutabasir/director-lens-platform
git pull
git revert <sha>       # creates a new commit that undoes the change
git push
```

Never `git push --force` unless the branch tip is known to be a commit
this session created (safe because `mutabasir/*` is owned solely by
this project). Prefer `--force-with-lease` when in doubt.

### Database rollback

Migrations are additive by policy. If a migration must be undone:

1. Write a **new** migration file (`0002_revert_xxx.sql`) that drops
   what `0001_init.sql` added.
2. Apply it: `npm run db:apply`.
3. Never edit an already-applied migration in place.

`public._migrations` tracks applied filenames so `npm run db:apply` is
idempotent.

## Known deployment gotchas

- **`demo@mutabasir.ae` visible in Settings** → Supabase env vars are
  not set in the Vercel project. Set them and redeploy.
- **PDF text extraction shows "no text"** → older deployments predate
  commit `606bca4`. Redeploy from tip.
- **On-device AI won't load on Android** → Vulkan driver rejection.
  Since commit `f5f65f6` we probe before download and show a friendly
  bilingual explanation; the deterministic extractor still works.
- **First-load JS regression** → check `npm run build` output against
  `docs/PERFORMANCE_REPORT.md` budgets before merging.

## Files that would need attention on a full production hand-off

- `.env.example` — inventory of vars (already documented)
- `supabase/migrations/*.sql` — apply once
- `README.md` — kept in sync with the branch name and package
- `docs/RELEASE_READINESS_REPORT.md` — verifier's checklist
- `docs/SECURITY_AND_RESPONSIBLE_AI_ASSESSMENT.md` — CSP + dependency
  bumps
