# TG Links - cPanel Node.js Deployment Guide

This guide explains how to deploy **TG Links** on any web hosting provider with **cPanel Node.js Application Manager** (CloudLinux / Phusion Passenger), while preserving your existing VPS and container deployments.

---

## 1. Quick Overview

TG Links features a hybrid architecture:
- **Frontend**: High-performance React 19 SPA bundled with Vite into `dist/`.
- **Backend**: Express server bundled into `dist/server.cjs`.
- **cPanel Startup Entry Point**: `app.js` (launches the pre-bundled server with cPanel's dynamic port/socket).
- **Database**: File-based persistence in `data.json` (or via custom `DB_PATH`).

---

## 2. cPanel Setup via Node.js Application Manager

1. **Log in to cPanel** and navigate to the **Software** section.
2. Click **Setup Node.js App** (Node.js Application Manager).
3. Click the **Create Application** button in the top right.
4. Fill in the configuration fields:

| Field | Recommended Value | Notes |
| :--- | :--- | :--- |
| **Node.js Version** | **20.x** (or latest 20 LTS) | Node.js 20+ required for ES modules & modern runtime. |
| **Application Mode** | **Production** | Ensures static asset serving and caching optimizations. |
| **Application Root** | `tglinks` (or your chosen path) | The directory relative to `/home/username/`. |
| **Application URL** | `yourdomain.com` | Your domain or subdomain configured in cPanel. |
| **Application Startup File** | `app.js` | Points directly to the production entry point. |

5. Click **Create** to initialize the application.

---

## 3. Uploading & Building Application Files

### Option A: Upload Pre-Built Files (Recommended for Fast Deployment)
If you build locally before uploading:
1. In your local development folder, run:
   ```bash
   npm install
   npm run build
   ```
2. Upload the following files/folders to your **Application Root** directory in cPanel (via File Manager or FTP):
   - `app.js` *(cPanel startup file)*
   - `package.json`
   - `dist/` *(contains compiled frontend and `dist/server.cjs`)*
   - `data.json` *(initial database)*
   - `.env` *(optional environment variables)*
   - `public/` *(static favicon & assets)*
3. In cPanel **Setup Node.js App**, click **Run NPM Install** (or install production dependencies).
4. Click **Restart Application**.

---

### Option B: Build Directly on cPanel (via cPanel Terminal or Web Terminal)
If your cPanel account provides Terminal access:
1. Enter the virtual environment command shown at the top of the cPanel Node.js page:
   ```bash
   source /home/username/nodevenv/tglinks/20/bin/activate && cd /home/username/tglinks
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```
3. Run the production build command:
   ```bash
   npm run build
   ```
   *This command runs `vite build` to bundle frontend assets to `dist/` and `esbuild` to compile `server.ts` to `dist/server.cjs`.*
4. Restart the application via cPanel UI or touch `tmp/restart.txt`.

---

## 4. Environment Variables Configuration

In cPanel, open your application in **Setup Node.js App** and scroll to **Environment Variables**:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Set to `production` for optimal performance. |
| `DB_PATH` | *(optional)* `./data.json` | Specify an absolute path if you prefer storing database outside the web root (e.g., `/home/username/tglinks_data/data.json`). |
| `PORT` | *(auto-assigned)* | **Do not manually set `PORT`** on cPanel unless needed. cPanel Passenger automatically injects its internal socket/port. |

---

## 5. Database Persistence & Backups

1. **Local JSON Database (`data.json`)**:
   - Stored in the application root directory (or at `DB_PATH` if configured).
   - Preserved across application restarts and rebuilds.
   - Initialized with default settings and admin credentials if not present.
2. **Instant Backups**:
   - Access **Admin Panel > Database & Settings** to download raw `.json` or compressed `.json.gz` backups anytime.
   - Built-in hourly SMTP backups can automatically send email copies of your database.

---

## 6. How to Restart the Application

Whenever you update files or change environment variables:
- **Method 1 (cPanel UI)**: Go to **Setup Node.js App** and click the **Restart** button.
- **Method 2 (Passenger Hot Restart)**: In cPanel File Manager or terminal, create or touch the file:
  ```bash
  mkdir -p tmp && touch tmp/restart.txt
  ```
  Phusion Passenger will automatically reload worker processes without dropping active requests.

---

## 7. Preserving Existing VPS Deployments

Your existing VPS workflow remains 100% operational with no changes required:
```bash
# On VPS:
npm install
npm run build
npm start # runs "node dist/server.cjs"
```
Or run directly in development mode with live TypeScript compilation:
```bash
npm run dev # runs "tsx server.ts"
```
