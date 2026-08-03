# Deploying MachinistPro to Vercel

## One-time Setup (you run these once, from your machine)

```bash
# 1. Login to Vercel (opens browser)
vercel login

# 2. From the repo root, link the project (first time only)
vercel link

# 3. Set the required env vars (replace with your real values)
vercel env add SUPABASE_URL production
# → paste: https://zgkuwhoebnlhzrzdylzf.supabase.co

vercel env add SUPABASE_PUBLISHABLE_KEY production
# → paste your new publishable key (rotate the one exposed in git history)

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# → paste service-role key from Supabase Project Settings → API

vercel env add MUGHAL_APP_NAME production
# → paste: MachinistPro

vercel env add MUGHAL_OWNER_ID production
# → paste your Mughal owner ID

vercel env add MUGHAL_VERSION production
# → paste: 1.0

vercel env add SESSION_PEPPER production
# → generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# And the VITE_ equivalents (for client-side bundle):
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
vercel env add VITE_SUPABASE_PROJECT_ID production

# 4. Run the Supabase migration for the sessions table
supabase db push
# (or apply just the file: supabase/migrations/20260802120000_create_sessions.sql)
```

## Every Deploy After That

```bash
npm run build    # local sanity check
vercel deploy --prod
```

## GitHub Auto-Deploy (recommended)

Once you link the Vercel project to this GitHub repo:
- Every push to `main` triggers a production deploy
- Every PR gets a preview deployment

To set this up:
1. Run `vercel link` once from this repo
2. In Vercel Dashboard → Project → Settings → Git → Connect Git Repository

## Verifying Login After Deploy

```bash
# Should return success+sessionToken
curl -X POST https://your-domain.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"YOU","password":"PASS"}'

# Should return {"valid":true, ...}
curl -X POST https://your-domain.vercel.app/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"sessionToken":"<hex-from-above>"}'
```
