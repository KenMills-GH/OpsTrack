# OpsTrack API Lightweight Deploy Checklist

Use this when deploying the API for portfolio/demo purposes.

## 1. Prerequisites

1. Push `OpsTrack-api` to GitHub.
2. Confirm local checks pass:
   - `npm run demo:check`
3. Have a managed Postgres database ready (Neon recommended).

## 2. Initialize Database

1. Create a Postgres database.
2. Run `init.sql` once against that database.
3. Confirm seeded users exist (needed for smoke/login checks).

## 3. Deploy API Service (Render/Fly/Railway)

Use these settings:

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Node version: `>=18`

## 4. Set Environment Variables

Set all of the following in your hosting provider:

- `NODE_ENV=production`
- `PORT=5000` (or provider default)
- `DATABASE_URL=<Neon connection string>`
- `DB_SSL=true`
- `JWT_SECRET=<long-random-secret>`
- `CORS_ORIGIN=<your-frontend-url>`

Optional fallback if you do not want to use a single connection string:

- `DB_USER=...`
- `DB_HOST=...`
- `DB_DATABASE=...`
- `DB_PASSWORD=...`
- `DB_PORT=5432`

Reference template: `.env.example`

## 5. Verify Deployment

1. Health check:
   - `GET https://<api-domain>/healthz` returns `{ "status": "ok" }`
2. Readiness check:
   - `GET https://<api-domain>/readyz` returns `{ "status": "ready" }`
3. Run remote smoke check:
   - `npm run smoke:remote -- https://<api-domain>`

## 6. Troubleshooting

1. 401 on every request:
   - Verify JWT login works and token is being sent.
2. CORS blocked in browser:
   - `CORS_ORIGIN` must exactly match frontend URL (including `https`).
3. 500 database errors:
   - Verify `DATABASE_URL` or the split `DB_*` env vars and that `init.sql` was run.
4. Login rate-limit behavior:
   - Expected in production after repeated failures.
