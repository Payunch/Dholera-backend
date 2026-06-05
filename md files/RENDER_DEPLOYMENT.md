# Deploying Dholera Backend to Render with SQLite

This guide explains how to deploy the backend to Render using SQLite with a persistent disk.

## Prerequisites

1.  A **Render account** (Free or Paid).
2.  Your code pushed to a **GitHub/GitLab/Bitbucket repository**.
3.  **Note:** Persistent Disks on Render require a **Paid Instance Type** (e.g., Starter plan, starting at $7/month). The Free tier does not support persistent disks, meaning your database will be reset on every deploy.

## Deployment Steps (Using Blueprint)

The easiest way to deploy is using the `render.yaml` file I've created.

1.  Log in to [Render Dashboard](https://dashboard.render.com).
2.  Click **New +** and select **Blueprint**.
3.  Connect your repository.
4.  Render will detect the `render.yaml` file in `Dholera-backend/`.
5.  It will show you the services to be created (`dholera-backend`).
6.  Click **Apply**.

## Manual Deployment Steps (Alternative)

If you prefer to set it up manually:

1.  **Create a New Web Service**:
    *   Root Directory: `Dholera-backend`
    *   Runtime: `Node`
    *   Build Command: `npm install`
    *   Start Command: `npm start`
    *   Plan: `Starter` (Required for Disk)

2.  **Add a Persistent Disk**:
    *   Go to the **Disks** tab of your service.
    *   Click **Add Disk**.
    *   Name: `sqlite-data`
    *   Mount Path: `/data`
    *   Size: `1GB` (Minimum is enough for SQLite).

3.  **Configure Environment Variables**:
    *   `NODE_ENV`: `production`
    *   `DATABASE_URL`: `/data/database.sqlite`
    *   `DB_DIALECT`: `sqlite`
    *   `DB_SYNC_ALTER`: `true`
    *   `SESSION_SECRET`: (Generate a long random string)
    *   `JWT_SECRET`: (Generate a long random string)
    *   `ALLOWED_ORIGINS`: (Your frontend URL, e.g., `https://dholera-frontend.onrender.com`)

## Important Notes on SQLite + Render

*   **Persistence**: By mounting the disk at `/data` and setting `DATABASE_URL` to `/data/database.sqlite`, your database file is stored outside the temporary container and will survive restarts and redeploys.
*   **Sessions**: I have updated the backend to use `connect-sqlite3`. This means your user sessions will also be stored on the disk at `/data/sessions.sqlite`, so users won't be logged out when you redeploy.
*   **Scale**: SQLite is great for single-instance apps. If you ever need to scale to multiple instances of the backend, you must migrate to PostgreSQL, as SQLite files cannot be shared across multiple instances on Render.
