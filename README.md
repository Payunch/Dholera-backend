# Dholera Backend

Node.js backend for the Dholera project. It handles admin authentication, leads, updates, PDF viewing, WhatsApp integration, and file uploads.

## What was completed

- Cloudinary integration for image uploads and PDF storage.
- Shared Cloudinary helper to keep credentials out of code.
- PDF viewer support for Cloudinary-hosted documents.
- PDF migration tooling to move existing files to Cloudinary.
- Auto-seed script for PDF records on a fresh database.
- Git safety updates so `.env` and local database files stay out of the repo.
- Health endpoints for runtime checks.

## What remains

- One oversized PDF is still stored locally because Cloudinary rejected it above the upload limit.
- Decide whether to keep that single file local, replace it with a smaller source file, or change the Cloudinary plan/settings.
- Optional future cleanup: simplify the PDF viewer flow so internal testing is easier when a lead token is not available.

## Current bug

- The large PDF is still not visible remotely because it never uploaded successfully.
- The secure PDF viewer also requires a valid lead token, so opening the viewer without a token returns `403`.
- The old README content was stale and did not match the actual Node backend.

## Local setup

```bash
npm install
npm start
```

The server runs on `http://localhost:3000` by default.

## Environment variables

Copy [.env.example](.env.example) to `.env` and fill in the values you need.

Important values:

- `PORT`
- `NODE_ENV`
- `ALLOWED_ORIGINS`
- `SESSION_SECRET`
- `JWT_SECRET`
- `ADMIN_USER`
- `ADMIN_PASS`
- `CLOUDINARY_URL` or the individual `CLOUDINARY_*` values

## Key routes

- `GET /healthz` - basic liveness
- `GET /healthz/runtime` - runtime diagnostics
- `GET /api/pdf/view/:id` - secure PDF viewer
- `POST /api/admin/uploads/image` - upload image
- `POST /api/admin/uploads/pdf` - upload PDF
- `POST /api/auth/login` - admin login
- `GET /api/auth/me` - current admin session

## Notes

- PDFs can come from Cloudinary or local storage depending on the record.
- Local PDFs are still served from `uploads/pdfs` when the record points to a local file.
- `database.sqlite` is local-only and ignored by Git.