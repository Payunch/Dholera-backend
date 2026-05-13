# Dholera Platform Runbook

This runbook captures the current production flow for the Dholera platform across the Flutter APK, React frontend, and Node.js backend.

## 1. What Runs Where

- Flutter APK: admin dashboard for mobile use
- React frontend: public site and web admin surface
- Node.js backend: auth, leads, updates/blogs, analytics, export, PDF access, settings
- Database: SQLite in current deployment, with PostgreSQL migration planned

## 2. Current Verified Features

- Real analytics summary and detailed daily analytics
- Day, month, year, and custom-range analytics filtering
- Persistent updates/blogs stored in the backend database
- Excel export for lead data
- Flutter APK with branded dashboard and analytics visualizations

## 3. Key Environment Variables

Backend:

```env
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://dholeraplatform.com,https://www.dholeraplatform.com,https://dholera-frontend-production.up.railway.app
DATABASE_URL=./database.sqlite
DB_SYNC_ALTER=true
JWT_SECRET=...
SESSION_SECRET=...
ADMIN_USER=...
ADMIN_PASS=...
```

Frontend:

```env
VITE_API_BASE_URL=https://dholera-backend-production.up.railway.app/api
VITE_APP_NAME=Dholera Growth Platform
```

Flutter:

- `lib/config/api_config.dart` points the app to the backend API base URL
- `assets/images/logo.svg` is the current branded logo asset

## 4. Local Development

Backend:

```bash
cd Dholera-backend
npm install
npm start
```

Frontend:

```bash
cd Dholera-frontend
npm install
npm run dev
```

Flutter APK:

```bash
cd dholera
export ANDROID_SDK_ROOT=~/.android/sdk
export ANDROID_HOME=~/.android/sdk
flutter pub get
flutter build apk --release
```

## 5. Deployment Flow

### Backend on Railway

1. Push the backend repository to `main`.
2. Confirm Railway variables are set.
3. Confirm `database.sqlite` is not tracked by Git.
4. Verify deployment health at `/healthz`.
5. Verify analytics and export endpoints after deploy.

### Frontend Hosting

1. Build with `npm run build`.
2. Deploy the output to the configured host.
3. Confirm `VITE_API_BASE_URL` points to the live backend.

### Flutter APK

1. Update branding assets when the final logo changes.
2. Run `flutter build apk --release`.
3. Install on device and verify login, dashboard, analytics, and export flows.

## 6. Verification Checklist

- `GET /healthz` responds with `ok: true`
- `GET /api/analytics` returns summary metrics
- `GET /api/analytics/detailed?start=YYYY-MM-DD&end=YYYY-MM-DD` returns daily metrics
- `GET /api/leads/export` downloads a valid `.xlsx`
- New updates/blogs remain after restart or redeploy
- Flutter APK loads analytics from the real backend

## 7. Known Operational Notes

- SQLite is still the active production database.
- `DB_SYNC_ALTER=true` is useful for schema drift during development, but PostgreSQL with migrations is the long-term fix.
- CSRF protection is active for admin login and protected mutations.
- Admin export requires login plus a CSRF token.

## 8. Next Platform Work

- PostgreSQL migration with explicit migrations
- CI/CD for backend, frontend, and Flutter builds
- Log monitoring and alerts
- Production backup and restore workflow
