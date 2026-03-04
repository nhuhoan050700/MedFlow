# Host This Project Globally

This guide walks you through deploying MedFlow so it’s reachable worldwide (HTTPS, custom domain optional).

## What You’re Hosting

| Part | Role | Suggested host |
|------|------|-----------------|
| **Frontend** | Patient app (check-in, procedures, payment) | Vercel |
| **Worker dashboard** | Staff app (orders, status updates) | Vercel (separate project) |
| **n8n** | Webhooks and workflows | n8n Cloud |
| **PostgreSQL** | Database | Railway |

All of these have global CDN/regions and HTTPS by default.

---

## 1. Database (Railway) – already global

1. Go to [railway.app](https://railway.app) and sign in.
2. **New Project** → **Provision PostgreSQL**.
3. After it’s created, open the PostgreSQL service → **Variables** and copy `DATABASE_URL` (or host, port, user, password).
4. Run your schema once (Railway **Query** tab or `psql $DATABASE_URL -f database/schema.sql`).
5. Run any migrations in `database/migrations/` if needed.

Railway’s PostgreSQL is already accessible over the internet; you’ll use this URL in n8n and (if needed) in your apps.

---

## 2. n8n (n8n Cloud) – webhooks need a public URL

Your frontend and worker dashboard call n8n **webhooks**. Those must be on a public HTTPS URL.

1. Sign up at [n8n.cloud](https://n8n.cloud) and create a workspace.
2. You’ll get a URL like `https://yourname.app.n8n.cloud`.
3. **Webhook base URL** = `https://yourname.app.n8n.cloud/webhook`  
   Use this as `NEXT_PUBLIC_N8N_WEBHOOK_URL` in the frontend and worker dashboard.
4. In n8n: **Credentials** → add **Postgres** with your Railway DB details.
5. **Workflows** → import all JSON files from `n8n-workflows/` (check-in, procedure-selection, payment, cart-payment, local-bank-payment, email-confirmation, status-update, worker-orders, order-status, update-profile).
6. Set credentials on each workflow (Postgres, Stripe, SMTP, etc.) and **activate** every workflow that has a webhook trigger.

Test: open `https://yourname.app.n8n.cloud/webhook/procedures` in a browser; you should get JSON (not 404).

---

## 3. Frontend (Vercel) – patient app

1. Push your code to **GitHub** (e.g. repo `yourname/hospital-system`).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import that repo.
3. Set **Root Directory** to `frontend`.
4. **Environment variables** (add for Production, and Preview if you use it):

   | Name | Value |
   |-----|--------|
   | `NEXT_PUBLIC_N8N_WEBHOOK_URL` | `https://yourname.app.n8n.cloud/webhook` |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` |

5. **Deploy**. Vercel will give you a URL like `https://your-project.vercel.app`.

### Google OAuth (required for sign-in)

- In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → your OAuth client:
  - **Authorized JavaScript origins:**  
    `https://your-project.vercel.app`  
    (and your custom domain later, e.g. `https://app.yourdomain.com`)
  - **Authorized redirect URIs:**  
    `https://your-project.vercel.app`  
    (and custom domain if you add one)

---

## 4. Worker dashboard (Vercel) – second project

1. **Add New** → **Project** in Vercel and import the **same repo** again (or a repo that contains `worker-dashboard`).
2. Set **Root Directory** to `worker-dashboard`.
3. Add the same `NEXT_PUBLIC_N8N_WEBHOOK_URL` (your n8n Cloud webhook base).
4. **Deploy**. You’ll get a different URL, e.g. `https://worker-dashboard.vercel.app`.

Use this URL only for staff; you can later add auth or a secret path.

---

## 5. Point everything to production URLs

After deploy, confirm:

- **Frontend** uses `NEXT_PUBLIC_N8N_WEBHOOK_URL` = your n8n Cloud webhook base (no trailing slash).
- **Worker dashboard** uses the same `NEXT_PUBLIC_N8N_WEBHOOK_URL`.
- **n8n** has Postgres (and Stripe/SMTP) credentials pointing at your Railway DB and APIs.
- **Google OAuth** has your Vercel frontend URL(s) in origins and redirect URIs.

Then test:

1. Open the frontend URL → Sign in with Google → select procedure → pay (Stripe or bank).
2. Open the worker dashboard URL → confirm orders appear and status updates work.

---

## 6. Custom domain (optional)

- **Vercel:** Project → **Settings** → **Domains** → add e.g. `app.yourdomain.com` and `staff.yourdomain.com`. Add the CNAME records your DNS provider shows.
- **Google OAuth:** Add `https://app.yourdomain.com` and `https://staff.yourdomain.com` to authorized origins and redirect URIs.
- **n8n Cloud:** Custom domains depend on your plan; the default `*.app.n8n.cloud` URL is already global and HTTPS.

---

## Checklist

- [ ] Railway PostgreSQL created and schema + migrations applied
- [ ] n8n Cloud workspace created; webhook base URL noted
- [ ] All workflows imported in n8n, credentials set, workflows **activated**
- [ ] Frontend deployed on Vercel (root `frontend`), env vars set
- [ ] Worker dashboard deployed on Vercel (root `worker-dashboard`), env vars set
- [ ] Google OAuth configured with production frontend URL(s)
- [ ] Test: check-in → procedure → payment → worker dashboard status update

Once this is done, your app is hosted globally with HTTPS; you can add custom domains and worker-dashboard auth as needed.
