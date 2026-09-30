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

## Current application limitation

Saved-cafe selections currently live only in frontend state and are not persisted per user in Supabase. Cafe lookup also depends on public Overpass services, whose availability can vary. These limitations are independent of the hosting setup.