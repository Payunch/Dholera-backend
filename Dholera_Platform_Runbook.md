# Dholera Growth Platform: Comprehensive Architecture & Deployment Runbook

This document is the ultimate guide to how the Dholera Growth Platform is built, hosted, connected, and maintained. It explains everything from scratch, detailing how the Frontend, Backend, Database, Emails, and Domains interact.

---

## 1. System Architecture Overview

The Dholera platform uses a modern decoupled architecture. This means the visual website (Frontend) and the data processing server (Backend) live in two different places but talk to each other over the internet.

### The Stack
*   **Frontend (Website):** React (Vite)
*   **Backend (API/Server):** Node.js (Express)
*   **Database:** SQLite (Currently) -> *Migrating to PostgreSQL later*
*   **Emails:** Resend API
*   **Hosting:** Render (Frontend) + Railway (Backend)
*   **Domain Registrar:** GoDaddy

---

## 2. Where Everything Lives (Hosting)

### A. Render (The Frontend)
*   **What it does:** Hosts the React website that users see in their browsers.
*   **Why Render?** Excellent for static sites, fast global CDN, and free SSL certificates.
*   **Connection:** It serves the website at `dholeraplatform.com`.

### B. Railway (The Backend & Database)
*   **What it does:** Hosts the Node.js API. It processes logins, generates OTPs, saves leads to the database, and talks to Resend to send emails.
*   **Why Railway?** Excellent for Node.js apps and attaching quick databases.
*   **Connection:** It listens for requests at `api.dholeraplatform.com`.

### C. Resend (Email Delivery)
*   **What it does:** Ensures OTP emails don't go to Spam.
*   **How it works:** The Backend uses an API key to tell Resend: *"Send this OTP to user@email.com"*.
*   **Verification:** We added specific DNS records in GoDaddy so Resend is allowed to send emails "from" `@dholeraplatform.com`.

---

## 3. The DNS Flow (GoDaddy Setup Explained)

DNS (Domain Name System) is the phonebook of the internet. When a user types `dholeraplatform.com`, GoDaddy tells their browser where to go based on the "Records" we set up.

Here is exactly what your GoDaddy records do:

| Type | Name | Target / Value | What this actually means |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `216.24.57.1` | "If someone types `dholeraplatform.com` (root), send them to Render's server." |
| **CNAME** | `www` | `dholera-frontend.onrender...`| "If someone types `www.dholeraplatform.com`, also send them to Render." |
| **CNAME** | `api` | `6wimwomb.up.railway.app` | "If the Frontend asks for data from `api.dholeraplatform.com`, send that request to the Railway Backend." |
| **TXT** | `_railway-verify`| `railway-verify=9e401c...` | "Prove to Railway that we own this domain so they allow the connection." |
| **TXT** | `resend._domainkey`| `p=MIGfMA0GCS...` | "DKIM Record: Proves to Gmail/Yahoo that Resend is allowed to send emails for us." |
| **TXT** | `send` | `v=spf1 include:...` | "SPF Record: Lists the exact servers allowed to send email from our domain." |

---

## 4. How the Pieces Talk to Each Other (CORS & Environment Variables)

For security, browsers block websites from talking to random servers. We have to explicitly allow the connection.

### Frontend connecting to Backend:
In **Render** (Environment Variables), we set:
`VITE_API_URL=https://api.dholeraplatform.com/api`
*This tells the React app: "When a user submits a form, send the data here."*

### Backend accepting the Frontend:
In **Railway** (Variables), we set:
`ALLOWED_ORIGINS=https://dholeraplatform.com,https://www.dholeraplatform.com`
*This tells Node.js: "If a request comes from these websites, it is safe to process it (CORS)."*

---

## 5. Security & The "Bypass" Fallback

If a 3rd-party service (like Resend) fails, we don't want the platform to break.

*   **The Bypass (`123456`)**: In the Backend, if `sendOtpEmail` fails, we catch the error. Instead of showing the user a 500 error, we return: *"Email delivery delayed. Use test code 123456 to continue."*
*   This ensures the business never stops collecting leads, even during a temporary email outage.

---

## 6. Future Migration Guide: Moving to Oracle Cloud (OCI)

Railway is great, but as the platform grows, you may want a dedicated Virtual Private Server (VPS) like an **Oracle Cloud Always Free ARM Instance**.

### Step 1: Prepare the Oracle VPS
1. Spin up an Ubuntu ARM instance on Oracle Cloud.
2. Open Port `80` (HTTP), `443` (HTTPS), and `5000` (API) in the Oracle Security Lists (VCN).
3. SSH into the server and install **Node.js**, **Git**, and **PM2** (to keep the app running forever).

### Step 2: Migrate the Code
1. Clone the `Dholera-backend` repository onto the Oracle server.
2. Run `npm install`.
3. Create the `.env` file on the server. Copy all variables exactly as they are in Railway (including the Resend API keys).

### Step 3: Migrate the Database (Crucial)
1. In Railway, download your `database.sqlite` file.
2. Upload this file to the Oracle server inside your backend folder.
*If moving to PostgreSQL, you will need to dump the Railway Postgres DB and restore it to a Postgres instance on Oracle.*

### Step 4: Reverse Proxy (Nginx) & SSL
Node.js shouldn't handle HTTPS directly.
1. Install **Nginx** on Oracle.
2. Configure Nginx to listen on Port 80/443 and proxy pass traffic to `localhost:5000`.
3. Run **Certbot (Let's Encrypt)** to generate a free SSL certificate for `api.dholeraplatform.com`.

### Step 5: The DNS Switch (The Final Flip)
1. Go back to **GoDaddy**.
2. Find the **CNAME** record for `api`.
3. Change it from a `CNAME` pointing to Railway, into an **A Record** pointing to your new **Oracle Cloud Public IP Address**.
4. The moment DNS propagates, your Frontend will seamlessly start talking to the Oracle server instead of Railway.

---

## 7. Maintenance Checklist

*   **Monitoring:** Keep an eye on Railway/Render dashboards for memory usage.
*   **Database Backups:** Regularly download the `database.sqlite` file from Railway via their dashboard or CLI.
*   **Resend Quota:** Watch the Resend dashboard. The free tier allows 3,000 emails/month. Upgrade if traffic spikes.