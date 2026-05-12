# Dholera Backend API

## Executive Summary

The **Dholera Backend** is a Node.js Express REST API that powers the entire Dholera Growth platform ecosystem. It manages authentication, lead data, infrastructure updates, document storage, and analytics for both the admin mobile app and web frontend.

**Current Status:**
- ✅ Production-ready Node.js/Express server
- ✅ SQLite database with Sequelize ORM
- ✅ JWT authentication with session support
- ✅ Cloudinary integration for document storage
- ✅ Email and WhatsApp integration capabilities
- ⚠️ PostgreSQL migration needed for production scalability
- ⚠️ Redis caching layer recommended for high traffic

---

## Platform Architecture

### Core Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|----------|
| **Runtime** | Node.js 20+ | JavaScript server runtime |
| **Framework** | Express 5.x | RESTful API routing and middleware |
| **ORM** | Sequelize 6.x | Database schema and queries |
| **Database** | SQLite (dev) | Local development database |
| **Auth** | JWT + bcrypt | Token-based authentication |
| **Security** | Helmet, CORS, Rate Limit | Request security and protection |
| **File Storage** | Cloudinary + Local | Document and image storage |
| **Email** | Nodemailer | Transactional email delivery |
| **Sessions** | express-session + Redis | Stateful session management |
| **Logging** | Morgan | Request and error logging |

### Core Responsibilities

1. **Authentication & Authorization**
   - Admin login with JWT tokens
   - CSRF protection for form submissions
   - Session persistence across requests
   - Role-based access control (RBAC)

2. **Lead Management**
   - Lead creation and tracking
   - Source attribution
   - Engagement history
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

**Built with Node.js + Express | Managed by Dholera Backend Team | Last Updated: May 2026**

