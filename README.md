# Dholera Backend API

> **IMPORTANT: Automated Payment Integration (PhonePe/Razorpay) has been cancelled due to GSTIN compliance requirements. All payments are now handled manually via UPI QR, and document access is granted by the Admin.**

Node.js/Express API for the Dholera platform. It powers authentication, leads, updates/blogs, analytics, exports, PDF access, WhatsApp activity, and platform settings.

## Status

- Production-ready Express server
- Sequelize ORM with SQLite currently in use
- JWT/session auth with CSRF protection
- Real analytics summary and detailed analytics endpoints
- Persistent updates/blogs stored in the database
- Excel export for lead data

## Core Endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/csrf-token`
- `GET /api/analytics`
- `GET /api/analytics/detailed`
- `GET /api/leads`
- `GET /api/leads/export`
- `POST /api/leads`
- `GET /api/updates`
- `POST /api/updates`
- `DELETE /api/updates/:id`
- `GET /api/settings`
- `POST /api/settings`

## Environment

```env
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://dholeraplatform.com,https://www.dholeraplatform.com,https://dholera-frontend-production.up.railway.app
DATABASE_URL=./database.sqlite
DB_SYNC_ALTER=true
JWT_SECRET=your-secret
SESSION_SECRET=your-session-secret
ADMIN_USER=admin
ADMIN_PASS=your-admin-password
```

## Local Development

```bash
cd Dholera-backend
npm install
npm start
```

## PhonePe Payment Testing (Local)

When testing PhonePe locally we provide a landing endpoint that keeps the popup open and posts a message back to the opener. Recommended `.env` setting:

```
PHONEPE_REDIRECT_URL=http://localhost:3001/api/payment/landing/:merchantTransactionId
PHONEPE_WEBHOOK_URL=http://localhost:3001/api/payment/webhook
```

Start both backend and frontend and trigger the payment from the frontend. Check backend logs for `Initiating PhonePe payment` and the `redirectUrl` returned by PhonePe.

## Verification Commands

```bash
curl http://localhost:3000/healthz
curl "http://localhost:3000/api/analytics/detailed?start=2026-05-01&end=2026-05-13"
```

## Excel Export

The export route is admin-protected and returns an `.xlsx` workbook with lead details, visitor sessions, and document views.

## Operational Notes

- Do not commit `database.sqlite`.
- CSRF is required for admin login and protected mutations.
- PostgreSQL migration is the next major backend infrastructure step.
 Engagement history
   - Contact interaction logging

3. **Infrastructure Updates (Blog)**
   - Update creation and publishing
   - Rich media support (images, videos)
   - Timestamp and author tracking
   - Public feed aggregation

4. **Document Management**
   - PDF upload and storage
   - Token-based secure access
   - Expiration and revocation
   - File categorization

5. **Business Settings**
   - Dynamic configuration storage
   - WhatsApp number management
   - Support contact information
   - Platform-wide settings

6. **Analytics & Reporting**
   - Visitor tracking
   - Lead source attribution
   - Engagement metrics
   - Audit logging for compliance

---

## Development & Deployment

### Setup Instructions

```bash
# Clone and install
git clone git@github.com:Payunch/Dholera-backend.git
cd Dholera-backend
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Server
# Local development only. Set `NODE_ENV=production` in Railway.
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_USER=admin
DB_PASSWORD=password
DB_NAME=dholera_dev

# Authentication
JWT_SECRET=your-secure-secret-key
JWT_EXPIRY=7d
CSRF_SECRET=your-csrf-secret

# File Storage
CLOUDINARY_URL=cloudinary://key:secret@account

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# WhatsApp
WHATSAPP_NUMBER=919999999999

# Session
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-session-secret
```

### Local Development

```bash
# Start development server with nodemon
npm run dev
# API available at: http://localhost:3000

# Run tests
npm test

# Seed database with initial data
node scripts/seed.js

# Production build
npm start
```

### Production Deployment

**Option 1: Railway (Recommended)**
- See `railway.json` for configuration
- Connect GitHub repository
- Auto-deployment on push
- Environment variables via Railway dashboard

**Option 2: Traditional Server (AWS/GCP/Azure)**
```bash
# Build and run on server
npm install --production
NODE_ENV=production npm start

# Use PM2 for process management
npm install -g pm2
pm2 start index.js --name dholera-api
pm2 save
pm2 startup
```

**Option 3: Docker**
```bash
docker build -t dholera-backend .
docker run -e NODE_ENV=production -p 3000:3000 dholera-backend
```

---

## Project Structure

```
Dholera-backend/
├── config/
│   ├── database.js              # Sequelize connection & setup
│   └── env.js                   # Environment variable loader
├── controllers/
│   ├── authController.js        # Authentication endpoints
│   ├── leadController.js        # Lead management endpoints
│   ├── updateController.js      # Infrastructure update endpoints
│   └── documentController.js    # PDF upload/download endpoints
├── middleware/
│   ├── authMiddleware.js        # JWT verification
│   ├── csrfMiddleware.js        # CSRF protection
│   ├── errorHandler.js          # Error handling
│   └── validators.js            # Input validation
├── models/
│   ├── User.js                  # Admin user schema
│   ├── Lead.js                  # Lead data schema
│   ├── Update.js                # Infrastructure update schema
│   ├── Document.js              # Document metadata schema
│   └── AuditLog.js              # Activity audit trail
├── routes/
│   ├── auth.js                  # /api/auth/* routes
│   ├── leads.js                 # /api/leads/* routes
│   ├── updates.js               # /api/updates/* routes
│   └── documents.js             # /api/documents/* routes
├── services/
│   ├── cloudinaryService.js     # File upload/storage logic
│   ├── emailService.js          # Email sending logic
│   ├── whatsappService.js       # WhatsApp integration
│   └── auditService.js          # Activity logging
├── scripts/
│   ├── seed.js                  # Database seed script
│   ├── clean-db.js              # Database cleanup
│   └── migrate.js               # Database migration utility
├── tests/
│   ├── auth.test.js             # Authentication tests
│   ├── leads.test.js            # Lead endpoint tests
│   └── documents.test.js        # Document endpoint tests
├── uploads/                     # Local file storage (fallback)
├── index.js                     # Server entry point
├── package.json                 # Dependencies
└── .env.example                 # Environment template
```

---

## API Endpoints Overview

### Authentication
- `POST /api/auth/login` – Admin login (gets JWT + session)
- `POST /api/auth/logout` – Admin logout
- `GET /api/auth/me` – Get current user info
- `POST /api/auth/csrf-token` – Get CSRF token for forms

### Analytics (Admin only)
- `GET /api/analytics` – Get analytics summary
- `GET /api/analytics/detailed` – Get detailed analytics with daily metrics, top days, and lead trend. Requires `start` and `end` query parameters (YYYY-MM-DD).

### Leads
- `GET /api/leads` – List all leads (paginated)
- `POST /api/leads` – Create new lead
- `GET /api/leads/:id` – Get lead details
- `PUT /api/leads/:id` – Update lead
- `DELETE /api/leads/:id` – Delete lead
- `POST /api/leads/:id/visit` – Log visit interaction

### Infrastructure Updates
- `GET /api/updates` – List all updates (public)
- `POST /api/updates` – Create update (admin only)
- `PUT /api/updates/:id` – Update post (admin only)
- `DELETE /api/updates/:id` – Delete post (admin only)

### Documents
- `GET /api/documents` – List documents (public)
- `POST /api/documents/upload` – Upload PDF (admin only)
- `GET /api/documents/:id/view` – Get secure view URL
- `DELETE /api/documents/:id` – Delete document (admin only)

### Settings
- `GET /api/settings` – Get platform settings (public)
- `PUT /api/settings` – Update settings (admin only)

---

## Database Schema

### Key Tables

**users** – Admin user accounts
- id (PK), email, password_hash, role, created_at, updated_at

**leads** – Investor leads
- id (PK), name, email, phone, source, status, visit_count, created_at, updated_at

**updates** – Infrastructure blog posts
- id (PK), title, content, image_url, author_id (FK), created_at, updated_at

**documents** – Uploaded PDFs
- id (PK), filename, file_size, category, upload_url, access_token, expires_at, created_at

**audit_logs** – Activity tracking
- id (PK), user_id (FK), action, resource_type, resource_id, timestamp

---

## Security Considerations

### Authentication
- JWT tokens with 7-day expiration
- Refresh tokens for extended sessions
- CSRF protection on state-changing endpoints
- Password hashing with bcrypt (rounds: 10)

### API Security
- Rate limiting (100 req/15 min per IP)
- CORS configured for allowed origins only
- Helmet.js headers for XSS and clickjacking protection
- Input validation on all endpoints
- SQL injection prevention via Sequelize ORM

### Data Security
- Encrypted storage for sensitive fields (passwords, API keys)
- HTTPS/TLS in production only
- Document tokens expire after 24 hours
- Audit logs for all admin actions

---

## Performance & Scalability

### Current Limitations (SQLite)
- Single-user write limitation (testing/dev only)
- No horizontal scaling
- Limited concurrent connections

### Production Roadmap
- **Database**: MySQL/PostgreSQL for multi-instance deployment
- **Caching**: Redis for session and query caching
- **File Storage**: AWS S3 migration from Cloudinary
- **Load Balancing**: nginx reverse proxy
- **CDN**: CloudFront for static asset delivery

---

## Roadmap & Enhancements

**Q2 2026:**
- [ ] Multi-factor authentication (MFA) for admin accounts
- [ ] JWT refresh token system for improved UX
- [ ] Advanced lead scoring and ranking

**Q3 2026:**
- [ ] PostgreSQL migration with zero downtime
- [ ] Redis integration for caching and session management
- [ ] AWS S3 integration for file storage
- [ ] Sentry error tracking and monitoring

**Q4 2026:**
- [ ] WhatsApp Cloud API automation
- [ ] Email notification templates and scheduling
- [ ] Advanced analytics and reporting endpoints
- [ ] GraphQL API layer (optional)

---

## Operational Requirements

### Development Environment
- Node.js: 20.0 or higher
- npm or yarn package manager
- SQLite3 command-line tools
- Git for version control

### Production Environment
- **Minimum**: 1 GB RAM, 1 vCPU, 10 GB storage
- **Recommended**: 2 GB RAM, 2 vCPU, 20 GB storage
- **Database**: PostgreSQL 12+ (MySQL 5.7+)
- **Cache**: Redis 6.0+ (optional but recommended)
- **File Storage**: AWS S3 or Cloudinary
- **Monitoring**: CloudWatch, Datadog, or New Relic

### Database Backups
- Daily automated backups (AWS RDS or manual)
- 30-day retention policy
- Point-in-time recovery capability
- Monthly backup validation

---

## Support & Documentation

- **Frontend**: See [Dholera-frontend README](../Dholera-frontend/README.md)
- **Mobile App**: See [dholera (Flutter) README](../dholera/README.md)
- **API Documentation**: See `docs/API.md` (in progress)
- **Express.js Docs**: https://expressjs.com
- **Sequelize Docs**: https://sequelize.org
- **JWT Guide**: https://jwt.io

---

---
**Built with Node.js + Express | Managed by Dholera Backend Team | Last Updated: June 2026**

## 🚀 Next Phase: Advanced Enterprise Roadmap

The following technical enhancements are scheduled to elevate the Dholera Platform to an enterprise-grade service.

### Phase 1: Real-time Communication (1-2 Hours)
*   **WebSockets (Socket.io):** Transition from HTTP polling to real-time events.
*   **Benefit:** Admin approvals will unlock user documents in **0.1 seconds** instead of 5-10 seconds.
*   **Notifications:** Live "Toast" notifications in the Admin App for every new visitor or payment attempt.

### Phase 2: High-Performance Data Streaming (1 Hour)
*   **Node.js Streams & Pipes:** Full refactor of the PDF delivery engine.
*   **Benefit:** Faster loading for large technical maps and 90% reduction in server memory usage. Resilient to slow internet connections.

### Phase 3: Enterprise Database Migration (READY)
*   **SQLite to PostgreSQL:** Transition to a robust, hosted relational database on Railway.
*   **Migration Tool:** Use `scripts/migrate_to_postgres.js` to port data.
*   **Usage:** 
    ```bash
    TARGET_DATABASE_URL=your_postgres_url node scripts/migrate_to_postgres.js
    ```
*   **Status:** Backend drivers (`pg`) installed. Migration logic verified.

### Phase 4: "Unbreakable" Security Hardening (DONE)
*   **JWT Rotation:** Implementation of Access + Refresh token pairs.
*   **Device Binding:** Optional binding of Admin sessions to specific devices for maximum security.
*   **DDoS Protection:** Advanced rate-limiting and request signing for all sensitive API routes.

### Phase 5: Caching & Scalability (2 Hours)
*   **Redis Integration:** Adding an in-memory cache for frequently accessed PDF metadata and session states.
*   **Benefit:** Sub-millisecond response times for the Archive and Search features.

---
**Roadmap Status:** Prepared for Execution | **Lead Architect:** Paresh Solanki

# Dholera Backend API

> **IMPORTANT: Automated Payment Integration (PhonePe/Razorpay) has been cancelled due to GSTIN compliance requirements. All payments are now handled manually via UPI QR, and document access is granted by the Admin.**

Node.js/Express API for the Dholera platform. It powers authentication, leads, updates/blogs, analytics, exports, PDF access, WhatsApp activity, and platform settings.

## Status

- Production-ready Express server
- Sequelize ORM with SQLite currently in use
- JWT/session auth with CSRF protection
- Real analytics summary and detailed analytics endpoints
- Persistent updates/blogs stored in the database
- Excel export for lead data

## Core Endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/csrf-token`
- `GET /api/analytics`
- `GET /api/analytics/detailed`
- `GET /api/leads`
- `GET /api/leads/export`
- `POST /api/leads`
- `GET /api/updates`
- `POST /api/updates`
- `DELETE /api/updates/:id`
- `GET /api/settings`
- `POST /api/settings`

## Environment

```env
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://dholeraplatform.com,https://www.dholeraplatform.com,https://dholera-frontend-production.up.railway.app
DATABASE_URL=./database.sqlite
DB_SYNC_ALTER=true
JWT_SECRET=your-secret
SESSION_SECRET=your-session-secret
ADMIN_USER=admin
ADMIN_PASS=your-admin-password
```

## Local Development

```bash
cd Dholera-backend
npm install
npm start
```

## Verification Commands

```bash
curl http://localhost:3000/healthz
curl "http://localhost:3000/api/analytics/detailed?start=2026-05-01&end=2026-05-13"
```

## Excel Export

The export route is admin-protected and returns an `.xlsx` workbook with lead details, visitor sessions, and document views.

## Operational Notes

- Do not commit `database.sqlite`.
- CSRF is required for admin login and protected mutations.
- PostgreSQL migration is the next major backend infrastructure step.

Test no : 7435808031
TEST_USER_EMAIL (default: testuser@example.com)
TEST_USER_PASSCODE (default: 123456)

 # Dholera Growth Platform: Database Schema
        2 - 
        3 - This document defines the Sequelize models and their relationships within the Dholera Platform database.
        4 - 
        5 - ---
        6 - 
        7 - ## 1. Core Models
        8 - 
        9 - ### `Lead`
       10 - Stores user/investor profiles and authentication data.
       11 - *   `id`: Integer (PK)
       12 - *   `name`: String
       13 - *   `phone`: String (Unique, Indexed)
       14 - *   `email`: String
       15 - *   `status`: String (New, Contacted, Converted, etc.)
       16 - *   `source`: String (Website, App, Import)
       17 - *   `passcode`: String (Hashed)
       18 - *   `verified`: Boolean
       19 - *   `is_registered`: Boolean
       20 - *   `lead_token`: String (Unique)
       21 - *   `createdAt`, `updatedAt`: Timestamps
       22 - 
       23 - ### `Update` (Blogs/News)
       24 - Stores property updates and regional news.
       25 - *   `id`: Integer (PK)
       26 - *   `title`: String
       27 - *   `content`: Text
       28 - *   `category`: String
       29 - *   `imageUrl`: String (Cloudinary URL)
       30 - *   `published`: Boolean
       31 - *   `publishedAt`: DateTime (Historical timestamp)
       32 - 
       33 - ### `PdfDocument`
       34 - Metadata for industrial and regulatory PDFs.
       35 - *   `id`: Integer (PK)
       36 - *   `title`: String
       37 - *   `file_path`: String (Cloudinary URL or local path)
       38 - *   `category`: String
       39 - *   `is_protected`: Boolean
       40 - *   `documentDate`: DateTime
       41 - 
       42 - ---
       43 - 
       44 - ## 2. Interaction & Log Models
       45 - 
       46 - ### `VisitorSession`
       47 - Tracks individual browsing sessions before and after lead registration.
       48 - *   `id`: Integer (PK)
       49 - *   `browserFingerprint`: String
       50 - *   `sessionId`: String
       51 - *   `visitedPages`: Text (JSON string)
       52 - *   `timeSpent`: Integer
       53 - 
       54 - ### `PdfView`
       55 - Logs every time a lead views a document.
       56 - *   `lead_id`: Integer (FK -> Leads.id)
       57 - *   `pdf_id`: Integer (FK -> PdfDocuments.id)
       58 - *   `viewedAt`: DateTime
       59 - 
       60 - ### `PdfPurchase`
       61 - Tracks PhonePe transactions for protected documents.
       62 - *   `id`: Integer (PK)
       63 - *   `lead_id`: Integer (FK -> Leads.id)
       64 - *   `pdf_id`: Integer (FK -> PdfDocuments.id)
       65 - *   `amount`: Integer (Paise)
       66 - *   `status`: String (pending, completed, failed)
       67 - *   `transaction_id`: String (Merchant ID)
       68 - *   `gateway_payment_id`: String (PhonePe ID)
       69 - 
       70 - ---
       71 - 
       72 - ## 3. System & Admin Models
       73 - 
       74 - ### `AuditLog`
       75 - Tracks administrative actions (imports, restores, logins).
       76 - *   `eventType`: String
       77 - *   `actorId`: String
       78 - *   `details`: Text (JSON)
       79 - 
       80 - ### `UserSession`
       81 - Tracks Admin dashboard logins for security monitoring.
       82 - *   `username`: String
       83 - *   `ip`: String
       84 - *   `userAgent`: String
       85 - *   `loginAt`: DateTime
       86 - 
       87 - ---
       88 - 
       89 - ## 4. Relationships (ERD Summary)
       90 - 
       91 - *   **Lead (1:N) PdfView:** One lead can view multiple PDFs.
       92 - *   **Lead (1:N) PdfPurchase:** One lead can buy multiple PDFs.
       93 - *   **PdfDocument (1:N) PdfView:** One PDF can be viewed by many leads.
       94 - *   **Lead (1:N) ClearanceModel:** One lead can have multiple clearance project drafts.
       95 - 
       96 - ---
       97 - 
       98 - ## 5. Storage Notes
       99 - *   **Dialect:** Currently using **SQLite** (`database.sqlite`).
 /app/data/database.sqlite

# Dholera Backend API

> **IMPORTANT: Automated Payment Integration (PhonePe/Razorpay) has been cancelled due to GSTIN compliance requirements. All payments are now handled manually via UPI QR, and document access is granted by the Admin.**

Node.js/Express API for the Dholera platform. It powers authentication, leads, updates/blogs, analytics, exports, PDF access, WhatsApp activity, and platform settings.

---

## 🛡️ Technical Issue & Solution Log

| Date & Time | Component | Issue | Resolution |
| :--- | :--- | :--- | :--- |
| **02-Jun-2026 20:25** | System Architecture | Foreign Key constraints blocking full platform restore from JSON backups. | **Cascading Truncate:** Implemented reverse-dependency clearing logic. The system now clears child tables (sessions, purchases) before parent tables (leads), ensuring the `dholera-platform-backup` file can be restored safely to PostgreSQL. |
| **02-Jun-2026 20:15** | PDF Storage | PDFs 19 & 20 failing to load due to 401 Authenticated errors from Cloudinary. | **Secure Handshake:** Implemented force-signing for all Cloudinary assets. The backend now generates an ephemeral cryptographic signature for private PDFs, allowing secure streaming into the viewer. |
| **02-Jun-2026 19:45** | Auth System | "Invalid CSRF Token" causing 403 Forbidden errors during Admin Login. | **Persistent Sessions:** Migrated from in-memory sessions to **PostgreSQL-backed sessions** (`UserSessions_Store`). This ensures tokens remain valid across server restarts and scale events. |
| **02-Jun-2026 19:10** | DB Engine | Validation errors (500) during visitor tracking due to long referrer URLs. | **Schema Hardening:** Upgraded `source`, `ip`, and `userAgent` fields in PostgreSQL to `TEXT` and `STRING(500)`. Successfully executed `sync({alter:true})` on live database. |
| **02-Jun-2026 18:30** | Database | SQLite file locking and scalability limits reached. | **Enterprise Migration:** Successfully migrated all business data (Leads, Purchases, Logs) to a robust **Railway PostgreSQL** instance with zero data loss. |
| **02-Jun-2026 18:00** | Security | Critical hardcoded OTP bypass (123456) and exposed secrets detected. | **Hardening:** Removed all backdoors, purged plaintext passcodes, and implemented **JWT Rotation**. Secrets moved to Git-ignored encrypted storage. |

---

## 🚀 Next Phase: Advanced Enterprise Roadmap

The following technical enhancements are scheduled to elevate the Dholera Platform to an enterprise-grade service.

### Phase 1: Real-time Communication (DONE)
*   **WebSockets (Socket.io):** Transitioned from HTTP polling to real-time events.
*   **Benefit:** Admin approvals now unlock user documents in **0.1 seconds**.

### Phase 2: High-Performance Data Streaming (DONE)
*   **Node.js Streams & Pipes:** Refactored the PDF delivery engine.
*   **Benefit:** Huge technical maps open instantly without server memory bottlenecks.

### Phase 3: Enterprise Database Migration (DONE)
*   **SQLite to PostgreSQL:** Platform is now powered by a hosted relational database on Railway.
*   **Data Integrity:** Preserved all lead history and revenue logs during the migration.

### Phase 4: "Unbreakable" Security Hardening (DONE)
*   **JWT Rotation:** Session self-healing and token theft protection is active.
*   **App Check Shield:** Activated Firebase Play Integrity and reCAPTCHA Enterprise to block all bots.

---

## Core Endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/csrf-token`
- `GET /api/analytics/platform-insights`
- `GET /api/leads`
- `POST /api/payment/request-manual`
- `POST /api/payment/verify-utr`

## Environment

```env
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://dholeraplatform.com
DATABASE_URL=postgresql://...
COOKIE_DOMAIN=.dholeraplatform.com
FREE_TRIAL_PDF_ID=19
```

## Local Development

```bash
cd Dholera-backend
npm install
npm start
```

---
**Built with Node.js + Express | Managed by Dholera Backend Team | Last Updated: June 2, 2026**
