# Railway Deployment Guide - Dholera Backend

**Current Status**: Ready for production deployment  
**Start Command**: `npm start` (defined in railway.json)  
**Database**: SQLite (development) → PostgreSQL (production recommended)  
**Node Version**: ≥20.0.0

---

## Prerequisites

1. **Railway Account**: Create at https://railway.app
2. **GitHub Connection**: Link your Railway account to GitHub
3. **Environment Ready**: Backend is tested (7 passing tests via CI), `.gitignore` excludes SQLite db files

---

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Authorize Railway to access your GitHub account
5. Select the repository: `your-org/Dholera-backend`
6. Select the branch: `main`
7. Railway will auto-detect `railway.json` (Nixpacks builder configured)

---

## Step 2: Configure Environment Variables

Railway will detect the following variables. Set them in the Railway dashboard under **Variables**:

### Required for Production

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Enables security features (secure cookies, HTTPS-only) |
| `JWT_SECRET` | `<random-32+ chars>` | Use strong random string; used for session & admin auth |
| `SESSION_SECRET` | Same or different strong string | Session encryption; can match JWT_SECRET |
| `ADMIN_JWT_SECRET` | `<random-32+ chars>` | Optional; overrides JWT_SECRET for admin auth if set |
| `ADMIN_MFA_SECRET` | `<32-char base32>` | Optional; if set, enables 2FA for admin login (use authenticator app) |
| `ALLOWED_ORIGINS` | `https://dholeraplatform.com,https://www.dholeraplatform.com,https://dholerafrontend.onrender.com,http://localhost:5173` | CORS whitelist; comma-separated for multiple |
| `VITE_SITE_URL` | `https://dholeraplatform.com` | Canonical frontend URL; optional alias for the allowlist |
| `PORT` | `3000` (auto-assigned by Railway) | Railway sets this automatically; leave unset |
| `CLOUDINARY_URL` | `cloudinary://key:secret@cloudname` | **Optional**: If using Cloudinary for PDF/image storage |

### Optional (Advanced)

| Variable | Value | Notes |
|----------|-------|-------|
| `REDIS_URL` | `redis://host:port` | Optional; enables Redis session store for multi-instance scaling |
| `ADMIN_ACCESS_TOKEN_TTL_SECONDS` | `900` (15 min) | Admin JWT validity window |
| `ADMIN_REFRESH_TOKEN_TTL_SECONDS` | `2592000` (30 days) | Admin refresh token validity |
| `DB_SYNC_ALTER` | `false` or `true` | If `true`, auto-alters DB schema on startup (caution in prod) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name | Alternative to CLOUDINARY_URL |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Alternative to CLOUDINARY_URL |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Alternative to CLOUDINARY_URL |

### Generating Secrets

Use this command to generate strong secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Run it twice to get unique JWT_SECRET and SESSION_SECRET.

---

## Step 3: Configure Database

### Option A: Use Railway PostgreSQL (Recommended)

1. In Railway dashboard, go to **Variables**
2. Click **Add** → Select **PostgreSQL** plugin
3. Railway auto-sets `DATABASE_URL` (do NOT manually set it)
4. The database will be created and migrations run on first deploy

### Option B: Keep SQLite (Development Only)

- Leave `DATABASE_URL` unset
- Database will use SQLite in the Railway container (ephemeral storage; data lost on redeploy)
- **Not recommended for production** due to single-writer limitation

### Option C: External PostgreSQL

If using an external PostgreSQL server:
```
postgresql://user:password@host:port/database?sslmode=require
```

---

## Step 4: Deploy

### Option A: Automatic Deployment (Recommended)

1. Railway monitors your GitHub repository
2. Push to `main` branch: Railway auto-deploys
3. Watch deployment logs in Railway dashboard

### Option B: Manual Deploy

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project (interactive)
railway link

# Deploy
railway up
```

---

## Step 5: Verify Deployment

Once deployment is complete, Railway provides a public URL (e.g., `https://dholera-backend-prod-xyz.railway.app`).

### Health Check
```bash
curl https://dholera-backend-prod-xyz.railway.app/healthz
# Expected response: { "status": "ok", "uptime": 123.456 }
```

### Runtime Diagnostics
```bash
curl https://dholera-backend-prod-xyz.railway.app/healthz/runtime
# Expected response: { "status": "ok", "uptime": 123.456, "nodeEnv": "production", ... }
```

### Analytics Endpoint (Verify Auth)
```bash
curl -H "Authorization: Bearer <VALID_JWT>" \
  https://dholera-backend-prod-xyz.railway.app/api/analytics
# Expected: Analytics data or 403 if token invalid
```

### Logs

In Railway dashboard:
1. Select your service
2. Click **Logs** tab
3. Look for `[Server] ✅ Running on port 3000 (production)`
4. Verify no `[Error]` or `[DB]` connection failures

---

## Step 6: Update Frontend Configuration

Once backend is deployed, update the frontend to point to the new backend URL:

**In Dholera-frontend/.env.production** (Next.js branch):
```
NEXT_PUBLIC_API_URL=https://dholera-backend-prod-xyz.railway.app
NEXT_PUBLIC_SITE_URL=https://dholera-admin-frontend.railway.app
```
*(Use `VITE_API_URL` and `VITE_SITE_URL` if you are using the Vite-based `main` branch)*

Then redeploy the frontend.

---

## Rollback Procedure

If deployment causes issues:

1. **Railway Dashboard**: Go to **Deployments** tab
2. Find the previous successful deployment
3. Click **Rollback** → Confirm
4. Railway re-activates the previous version within 1-2 minutes
5. Check logs to verify recovery

---

## Monitoring & Logs

### View Logs in Railway

1. Select your service in the dashboard
2. Click **Logs** tab
3. Filter by:
   - `[Error]` for runtime errors
   - `[DB]` for database issues
   - `[CORS]` for cross-origin issues
   - `[Server]` for startup logs

### Key Log Patterns

| Pattern | Meaning |
|---------|---------|
| `[Server] ✅ Running on port 3000 (production)` | Healthy startup |
| `[DB] PostgreSQL → Connection via DATABASE_URL` | Using PostgreSQL |
| `[DB] SQLite → Connection via ./database.sqlite` | Using SQLite (dev mode) |
| `[CORS] Blocked origin: ...` | Frontend origin not in ALLOWED_ORIGINS |
| `Error: listen EADDRINUSE: address already in use :3000` | Port conflict (shouldn't happen on Railway) |

---

## Environment Variable Checklist

Before deploying, verify all variables are set:

```bash
# In Railway dashboard Variables section, ensure these are visible:
☐ NODE_ENV = production
☐ JWT_SECRET = ••••••••••••••••
☐ SESSION_SECRET = ••••••••••••••••
☐ ALLOWED_ORIGINS = https://your-frontend-domain.com
☐ (Optional) CLOUDINARY_URL (if using image storage)
☐ (Optional) REDIS_URL (if scaling to multiple instances)
```

---

## Troubleshooting

### Build Fails: "Nixpacks cannot find package.json"
- Verify `railway.json` exists in repository root
- Verify `package.json` is at `/Dholera-backend/package.json`
- Check that you selected the correct branch in Railway settings

### Deployment Succeeds but /healthz Returns 503
- Check in Railway **Logs** for connection errors
- Verify DATABASE_URL is set if using PostgreSQL
- Verify ALLOWED_ORIGINS includes your testing domain

### CORS errors from frontend
- Verify `ALLOWED_ORIGINS` matches the exact frontend URL (no trailing slash)
- Can be comma-separated: `https://example.com,https://example-staging.com`

### Admin Login Fails
- Verify `JWT_SECRET` is at least 32 characters
- If using `ADMIN_JWT_SECRET`, it overrides `JWT_SECRET` for admin auth
- Check `/api/auth/login` endpoint returns a token

### Database Connection Fails
- If using PostgreSQL: Verify `DATABASE_URL` format is `postgresql://user:pass@host/db`
- Check SSL is enabled in Railway PostgreSQL settings
- For external PostgreSQL: Verify host allows Railway IP ranges

---

## Performance Notes

- **Current Config**: 5 concurrent DB connections (max pool size)
- **Idle Timeout**: 10 seconds (connections reclaimed to save resources)
- **Rate Limiting**: 2000 requests/15min globally
- **CSRF Protection**: Enabled for POST/PUT/DELETE routes
- **For Multi-Instance Scaling**: Set `REDIS_URL` to share sessions across instances

---

## Next Steps

1. **Configure frontend**: Update `VITE_API_URL` to Railway backend URL
2. **Deploy frontend**: Connect Dholera-frontend to Railway
3. **Deploy mobile**: Optional; update Flutter app to point to production backend URL
4. **Monitor**: Set up error tracking (Sentry) and log aggregation (Loggly/Datadog)
5. **Plan PostgreSQL Migration**: Move from SQLite to PostgreSQL for multi-instance support

---

## Useful Links

- Railway Docs: https://docs.railway.app
- Railway Dashboard: https://railway.app/dashboard
- PostgreSQL Deployment: https://docs.railway.app/databases/postgresql
- Environment Variables: https://docs.railway.app/guides/environment-variables
