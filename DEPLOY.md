# Deploying MachinistPro

> **Important:** this project currently uses a Lovable Cloud managed backend. Its
> private service credential is intentionally not exposed and cannot be copied to
> Vercel or Cloudflare. That is why you could not find `SUPABASE_SERVICE_ROLE_KEY`.
> The earlier instructions incorrectly implied that you could retrieve it.

Everything below is written so you can follow it without knowing any of the
internals. Do the steps **in order**.

---

## 0. What is actually deployed

MachinistPro is a **server-rendered app** (TanStack Start + Nitro). It is NOT a
static site. The login, the 14-day trial and the admin panel all run **server
code**. If you configure Vercel as a "static site" (an `outputDirectory` plus a
rewrite of everything to `index.html`), every server call returns an HTML page
instead of JSON — that is exactly what produced **"Trial unavailable"** and
**"Authentication server is unavailable"** on your Vercel deploy.

That misconfiguration has now been removed from `vercel.json`. Do not add
`outputDirectory` or `rewrites` back.

---

## 1. Push the code to GitHub

```bash
git add .
git commit -m "Deploy config for Vercel"
git push origin main
```

---

## 2. Choose a supported deployment path

### Recommended: Lovable hosting (works with the current backend)

1. Open this project in Lovable.
2. Click **Publish** in the top-right corner.
3. Click **Update**.
4. Use `https://machinistpro.lovable.app` after deployment finishes.

No backend URL, publishable key, or private service key needs to be copied.

### Vercel or Cloudflare

The current custom users, admin panel, HWID locking, and trial system cannot be
deployed there by copying Lovable Cloud values. To self-host, first migrate the
database to a backend account you control. That provider will give you its own
URL, publishable key, and server-only service key. Never put the service key in a
`VITE_` variable or client code.

After that migration, create the Vercel project:

1. Go to https://vercel.com/new
2. Click **Import** next to your `MachinistPro` repository.
3. **Framework Preset:** choose **Other** (do NOT pick Vite or Next.js).
4. Leave Build Command / Output Directory **empty** — `vercel.json` already
   sets them.
5. **Do not click Deploy yet.** Open **Environment Variables** first (step 3).

---

## 3. Add the environment variables (this is the part that breaks trials)

In **Environment Variables**, add each of these for **Production, Preview and
Development** (tick all three boxes for every variable):

| Name | Value |
| --- | --- |
| `NITRO_PRESET` | `vercel` |
| `SUPABASE_URL` | your backend URL (`https://<project-ref>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only key from the external backend you control (not available from Lovable Cloud) |
| `SUPABASE_PUBLISHABLE_KEY` | the publishable (anon) key |
| `VITE_SUPABASE_URL` | same value as `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | same value as `SUPABASE_PUBLISHABLE_KEY` |
| `APP_PEPPER` | one long random string — see below |

Generate `APP_PEPPER` once and never change it. Keep it server-only:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Why each one matters**

- `NITRO_PRESET=vercel` — tells the build to produce Vercel serverless
  functions. Without it the build targets Cloudflare and Vercel serves nothing
  runnable, so every API call fails.
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — supplied by the external backend
  after migration; the server reads/writes users,
  sessions, device fingerprints and trials with these. Missing → "Trial
  unavailable" and "The admin panel couldn't load".
- `APP_PEPPER` — the secret mixed into device fingerprints. If it changes, all
  existing devices look brand new (people could re-take the trial), so set it
  once and keep it identical everywhere.

---

## 4. Deploy

Click **Deploy**. Wait for "Build Completed". First build takes ~2–4 minutes.

---

## 5. Test the deployment (do all four)

1. Open `https://<your-project>.vercel.app` → landing page loads.
2. Click **Start 14-Day Free Trial** → you land in the dashboard.
   - If it says "Trial unavailable", go to Vercel → your project → **Logs**,
     click the failing request. It will name the missing variable. Add it in
     step 3 and **Redeploy**.
3. Sign in with a real client account → dashboard loads.
4. Sign in as admin (`ahmedtabish1000@gmail.com`) → the Admin panel opens.

---

## 6. Redeploying after changes

Every `git push` to `main` deploys automatically.

If you change an environment variable, Vercel does **not** rebuild by itself:
go to **Deployments → … → Redeploy** and untick "Use existing build cache".

---

## Troubleshooting cheat-sheet

| Symptom | Cause | Fix |
| --- | --- | --- |
| "Trial unavailable" | `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL` missing, or `NITRO_PRESET` not set | Add them in step 3, redeploy without cache |
| "Authentication server is unavailable" | same as above | same |
| All pages 404 | Output Directory / rewrites were added back | Remove them; keep `vercel.json` as shipped |
| Trial resets for people who already used it | `APP_PEPPER` changed | Restore the original value |
| Build fails on `npm install` | Node version | Vercel → Settings → General → Node.js Version → **22.x** |

---

## Cloudflare Pages (alternative)

Same idea, different preset: set `NITRO_PRESET=cloudflare_pages`, build command
`npm run build`, output directory `.output/public`, and add the same Supabase +
`APP_PEPPER` variables.
