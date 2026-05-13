# Railway Backend Deployment Checklist - Quick Start

**Goal**: Deploy Dholera-backend to Railway production in 15 minutes

---

## Pre-Deployment ✓

- [ ] Backend tested locally: `npm test` passes (7 tests)
- [ ] GitHub Actions CI workflow passing
- [ ] `.gitignore` includes `database.sqlite` (verified)
- [ ] `railway.json` exists at respository root with Nixpacks builder
- [ ] `package.json` has `"start": "node index.js"`
- [ ] `.env.example` documents all variables needed

---

## Step 1: Railway Account Setup (5 min)

- [ ] Go to https://railway.app
- [ ] Sign up / Log in
- [ ] Connect GitHub account (authorize Railway OAuth)
- [ ] Verify connection shows your Dholera repository

---

## Step 2: Create Railway Project (3 min)

- [ ] In Railway Dashboard: **New Project** → **Deploy from GitHub**
- [ ] Select repository: `your-org/Dholera-backend`
- [ ] Select branch: `main`
- [ ] Railway detects `railway.json` and starts build
- [ ] Watch deployment logs; should take 2-3 minutes
- [ ] Once deployed, Railway shows public URL (e.g., `https://dholera-backend-xyz.railway.app`)

---

## Step 3: Set Environment Variables (5 min)

In Railway Dashboard, go to **Variables** tab and add:

**Critical (App won't start without these)**:
```
NODE_ENV=production
JWT_SECRET=<generate using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
SESSION_SECRET=<generate using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
ALLOWED_ORIGINS=<your-frontend-domain.com or https://localhost:3000 for testing>
```

**Optional but Recommended**:
```
ADMIN_JWT_SECRET=<same as JWT_SECRET if not set>
VITE_SITE_URL=<same as ALLOWED_ORIGINS>
DB_SYNC_ALTER=false
```

**Optional (if using features)**:
```
CLOUDINARY_URL=<if storing PDFs in cloud>
REDIS_URL=<if scaling to multiple instances>
```

- [ ] Save variables in Railway dashboard

---

## Step 4: Configure Database (2 min)

**Choose ONE**:

### Option A: Railway PostgreSQL (Recommended)

- [ ] In Railway, go to **Variables** → **Add** → Select **PostgreSQL**
- [ ] Railway auto-creates PostgreSQL and sets `DATABASE_URL`
- [ ] No manual setup needed; skip to Step 5

### Option B: SQLite (Development Only)

- [ ] Leave `DATABASE_URL` unset
- [ ] Database uses ephemeral storage (recreated on redeploy)
- [ ] Good for testing; NOT production-ready

### Option C: External PostgreSQL

- [ ] Get connection string from your PostgreSQL provider
- [ ] Set `DATABASE_URL=postgresql://user:pass@host/dbname` in Variables
- [ ] Ensure SSL is enabled

- [ ] Database configuration complete

---

## Step 5: Verify Deployment

```bash
# Get your Railway URL from dashboard (looks like: https://dholera-backend-xyz.railway.app)

# Run verification script (requires curl & jq)
cd Dholera-backend
./verify-railway-deployment.sh https://dholera-backend-xyz.railway.app

# OR manual verification:
curl https://dholera-backend-xyz.railway.app/healthz
curl https://dholera-backend-xyz.railway.app/healthz/runtime

# Expected response:
# { "status": "ok", "uptime": 123.456 }
```

- [ ] Health check returns 200 OK
- [ ] `/healthz/runtime` shows production environment
- [ ] No errors in Railway Logs tab

---

## Step 6: Check Logs (if issues)

In Railway Dashboard → **Logs**:

- [ ] Look for: `[Server] ✅ Running on port 3000 (production)`
- [ ] Verify NO `[Error]` lines
- [ ] Verify NO `[DB] Connection failed` messages
- If errors appear, refer to RAILWAY_DEPLOYMENT.md **Troubleshooting** section

---

## Step 7: Connect Frontend (Next Step)

Once backend is verified:

1. Get your Railway backend URL from dashboard (e.g., `https://dholera-backend-prod.railway.app`)
2. Update [Dholera-frontend/.env.production](../Dholera-frontend/.env.production):
   ```
   VITE_API_URL=https://dholera-backend-prod.railway.app
   VITE_SITE_URL=https://dholera-admin-frontend.railway.app
   ```
3. Deploy frontend to Railway (same process, separate repository)
4. Point `ALLOWED_ORIGINS` in backend Variables to match frontend URL

---

## Rollback (if needed)

If deployment breaks anything:

1. Railway Dashboard → **Deployments**
2. Click previous successful deployment → **Rollback**
3. Railway reactivates previous version in 1-2 min
4. Check logs to verify recovery

---

## Success Criteria ✅

- [ ] `/healthz` returns 200 OK
- [ ] `/healthz/runtime` shows `"nodeEnv": "production"`
- [ ] Rails logs show no connection errors
- [ ] Frontend can reach backend without CORS errors
- [ ] Database persistence verified (create lead, refresh page, lead still there)

---

## Detailed Guides

- **Full Reference**: See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- **Environment Variables**: See [.env.example](./.env.example)
- **Troubleshooting**: See RAILWAY_DEPLOYMENT.md → Troubleshooting section

---

## Support

- Railway Docs: https://docs.railway.app
- Backend API Reference: See README.md in this directory
- Database Issues: Check .env.example for connection string formats
