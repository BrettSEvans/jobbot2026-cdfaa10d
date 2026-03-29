# Deploy Guide

## Stack

- **Frontend**: Vite + React + TypeScript, deployed via [Lovable](https://lovable.dev)
- **Backend**: Supabase (database + auth + edge functions)
- **CDN/DNS**: Cloudflare

## Deploy Process

### Frontend
Lovable auto-deploys from the `main` branch. Push to `main` → build triggers → live at https://www.resuvibe.ai within ~2 minutes.

No manual deploy steps required. CI runs lint + build + tests on every PR (see `.github/workflows/ci.yml`).

### Edge Functions
Supabase edge functions deploy automatically via Lovable when changes are pushed to `main`. To deploy manually:

```bash
supabase functions deploy <function-name>
```

### Environment Variables
Required GitHub Actions secrets (Settings → Secrets → Actions):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Local development: copy `.env.example` to `.env` and fill in values. **Never commit `.env`.**

## HTTPS

HTTP automatically redirects to HTTPS (301) via Cloudflare.
`Strict-Transport-Security: max-age=31536000; includeSubDomains` is set.

## Uptime Monitoring

Monitor is configured at [UptimeRobot](https://uptimerobot.com) — alerts go to the team email on downtime.

**Setup steps (if recreating):**
1. Log in to UptimeRobot → Add New Monitor
2. Type: HTTP(s), URL: `https://www.resuvibe.ai`, interval: 5 min
3. Add alert contact: team email
