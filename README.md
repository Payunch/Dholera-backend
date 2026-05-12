# Dholera Backend API

This is the standalone Node.js Express API for the Dholera Growth Evidence Platform.

## 🏗️ Architecture
- **Engine:** Node.js + Express
- **ORM:** Sequelize
- **Database:** SQLite (local development)
- **Security:** JWT Authentication, Helmet, Rate Limiting
- **Integrations:** Cloudinary (Storage), Nodemailer (Email), WhatsApp Links

## 📂 Structure
```text
dholera-backend/
├── config/             # Database connection & Sequelize config
├── controllers/        # Request handlers (Lead, Update, Auth, etc.)
├── middleware/         # Auth guards, upload validation, security
├── models/             # Database schemas
├── routes/             # Express route definitions
├── scripts/            # Database seeding, migration, cleanup
├── services/           # External logic (Cloudinary, WhatsApp, Audit)
├── tests/              # API & basic unit tests
├── uploads/            # Local persistent storage (fallback for Cloudinary)
├── index.js            # Server entry point
└── package.json        # Dependencies & scripts
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure your credentials.

### 3. Run Development Server
```bash
npm run dev
```
The API will be available at `http://localhost:3000`.

## 📜 Key Scripts
- `npm start`: Run in production mode.
- `npm run dev`: Run in development mode with nodemon.
- `node scripts/seed.js`: Seed the database with initial data.
- `node scripts/clean-db.js`: Wipe the database (use with caution).

---

## 🗺️ Backend Roadmap
- [ ] **Admin MFA:** Multi-factor authentication for admin login.
- [ ] **JWT Refresh Tokens:** Secure long-lived sessions.
- [ ] **WhatsApp Cloud API:** Fully automated lead notifications.
- [ ] **Email Alerts:** Instant notifications for high-interest leads.
- [ ] **PostgreSQL Migration:** Transition from SQLite for production scalability.
- [ ] **S3 Integration:** Complete local storage migration to AWS S3.
- [ ] **Sentry Logging:** Integrated error tracking and monitoring.

## ✅ Final Clean Status
- Removed redundant `cookies.txt` and `csrf.txt`.
- Removed old `database.sqlite.sql` dumps.
- Removed scratch files (`scratch_sync.js`, etc.).
- Standardized project layout.

## 🗺️ What was added to the Roadmaps

	2. Backend API
		 - Technical logic: Focus on MFA implementation, JWT refresh tokens, automated email alerts, and Sentry monitoring.
		 - Scalability: Detailed the transition path to a production-grade database.

