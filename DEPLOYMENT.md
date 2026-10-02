# Deployment

Local development remains unchanged when `VITE_API_BASE_URL` is unset: the frontend uses relative `/api` requests and Vite proxies them to `http://localhost:5000`.

## Railway backend

Create a Railway service from this repository and set its **Root Directory** to `/backend`. Railway will use `backend/railway.json`, install the backend dependencies, run `npm start`, and check `/api/health`.

Set these Railway variables:

- `NODE_ENV=production`
- `CORS_ORIGINS=https://<your-vercel-domain>`; comma-separate additional exact origins if needed
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (keep this private; never add it to Vercel)
- `GEMINI_API_KEY` (needed for the AI assistant)

Optional backend variables include `GEMINI_MODEL`, `OVERPASS_URL`, and `OVERPASS_URLS`. Railway supplies `PORT` automatically. After deployment, copy the Railway public HTTPS URL.

## Vercel frontend

Create a Vercel project from the same repository and set its **Root Directory** to `frontend`. Use the Vite framework preset and set this build environment variable:

- `VITE_API_BASE_URL=https://<your-railway-domain>` (no trailing slash)

The Vercel rewrite serves the SPA for app routes such as `/discover` and `/settings`, including direct page refreshes. Set the final Vercel production domain in Railway's `CORS_ORIGINS`, then redeploy the backend. Add each Vercel preview domain you plan to use to that comma-separated allowlist.

## Verify

- Open `https://<your-railway-domain>/api/health` and confirm it returns `status: "ok"`.
- Open the Vercel site, refresh a non-root route, and test sign-in, cafe lookup, and the AI assistant.
- Use browser developer tools to check for failed `/api` requests or CORS errors.

## Cafe database and sync

Before deploying the database-backed cafe endpoint, run `backend/sql/001_cafe_spatial_and_checkins.sql` in the Supabase SQL Editor. It adds the PostGIS location index and trigger, spatial search RPC, and decaying check-in aggregation for the existing `cafes` and `cafe_checkins` tables.

From the `backend` directory, run `npm run sync:cafes` to seed/update named cafes from OpenStreetMap's Overpass API. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the local environment; the service-role key must remain server-side. For ongoing updates, schedule that command with a task scheduler or cron provider, for example once per week. The sync merges OSM-tagged attributes without clearing existing Wi-Fi, outlet, or GCash values when OSM has no value for them.

Nearby cafe requests now search the Supabase PostGIS index rather than calling Overpass. Check-ins are authenticated, one current report per user and cafe, and reports older than 24 hours are excluded while newer ones lose influence exponentially.

## Current application limitation

Saved-cafe selections currently live only in frontend state and are not persisted per user in Supabase. Periodic sync freshness depends on the Overpass service and the configured scheduler.