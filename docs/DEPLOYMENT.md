# Deployment Guide — SalesTrack (sales-backup)

> **Application:** SalesTrack / sales-backup
> **Domain:** https://sales.abkciraya.cloud
> **VPS Path:** /var/www/sales-backup
> **Internal Port:** 3001

---

## Prerequisites

- **Node.js 20 LTS** (do NOT use Node 24)
- **PM2** installed globally
- **MySQL** running and accessible
- **Nginx** configured as reverse proxy to port 3001
- **SSL** via Let's Encrypt

### Node Version

The project requires Node 20 LTS. Use nvm to manage versions:

```bash
nvm install 20
nvm use 20
node -v  # should show v20.x.x
```

A `.nvmrc` file is included in the repo. Running `nvm use` in the project directory will automatically select the correct version.

---

## First-Time Setup

### 1. Create Log Directory

```bash
sudo mkdir -p /var/log/sales-backup
sudo chown -R root:root /var/log/sales-backup
```

### 2. Configure Environment

```bash
cd /var/www/sales-backup
cp .env.example .env
nano .env  # fill in DATABASE_URL, NEXTAUTH_SECRET, backup settings
```

### 3. Install & Build

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

### 4. Start PM2

```bash
PM2_HOME=/root/.pm2 pm2 start ecosystem.config.js
PM2_HOME=/root/.pm2 pm2 save
```

### 5. Install Backup Timer

```bash
# Add backup env vars to .env first:
# SALES_BACKUP_DIR="/root/backups/sales-backup-db"
# SALES_BACKUP_RETENTION_DAYS="30"

sudo bash scripts/install-db-backup-systemd.sh
```

---

## Standard Deployment Procedure

Use this procedure every time you deploy new code to production.

### Step 1 — Enter App Directory

```bash
cd /var/www/sales-backup
```

### Step 2 — Record Current State (for rollback)

```bash
git rev-parse HEAD
PM2_HOME=/root/.pm2 pm2 describe sales-backup
```

### Step 3 — Manual DB Backup Before Deploy

```bash
npm run backup:db
```

### Step 4 — Pull Latest Code

```bash
git fetch --all --prune
git status
git pull --ff-only
```

> If `git pull --ff-only` fails, investigate. Do NOT force pull without understanding.

### Step 5 — Install Dependencies

```bash
npm ci
```

### Step 6 — Database Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### Step 7 — Verify Before Restart

```bash
npm run lint
npx tsc --noEmit
npm run build
```

> **STOP HERE if any command fails. Do NOT restart PM2.**

### Step 8 — Reload Application

```bash
PM2_HOME=/root/.pm2 pm2 reload ecosystem.config.js --update-env
```

### Step 9 — Health Checks

```bash
# Internal health check
curl -fsS http://127.0.0.1:3001/api/health

# External health check
curl -fsS https://sales.abkciraya.cloud/api/health

# PM2 logs
PM2_HOME=/root/.pm2 pm2 logs sales-backup --lines 50 --nostream
```

Expected health response:
```json
{"ok":true,"service":"sales-backup","database":"ok","timestamp":"..."}
```

---

## Rollback Procedure

If the new deploy is broken:

```bash
cd /var/www/sales-backup

# Reset to previous commit
git reset --hard <previous_commit_hash>

# Rebuild
npm ci
npx prisma generate
npm run build

# Reload
PM2_HOME=/root/.pm2 pm2 reload ecosystem.config.js --update-env

# Verify
curl -fsS https://sales.abkciraya.cloud/api/health
```

> ⚠️ **If the new deploy included destructive database migrations**, do NOT rollback code blindly. Restore DB from backup first, and only after explicit owner approval.

---

## PM2 Commands Reference

```bash
# Start (first time)
PM2_HOME=/root/.pm2 pm2 start ecosystem.config.js

# Reload (zero-downtime)
PM2_HOME=/root/.pm2 pm2 reload ecosystem.config.js --update-env

# Restart (with downtime)
PM2_HOME=/root/.pm2 pm2 restart ecosystem.config.js --update-env

# Save PM2 process list for auto-start on reboot
PM2_HOME=/root/.pm2 pm2 save

# View logs
PM2_HOME=/root/.pm2 pm2 logs sales-backup --lines 100

# Process info
PM2_HOME=/root/.pm2 pm2 describe sales-backup
```

---

## Acceptance Checklist

Before considering a deploy successful, verify:

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] `npx prisma migrate status` shows DB up to date
- [ ] `/api/health` returns ok locally and via domain
- [ ] Salesforce login works
- [ ] First-login password change works
- [ ] Salesforce sees only submit-allowed outlets
- [ ] Submit transaction works
- [ ] Admin product duplicate shows clean error
- [ ] `npm run backup:db` creates backup on first run
- [ ] `npm run backup:db` skips backup on second run if no DB change
- [ ] Backup folder is outside `/var/www/sales-backup`
- [ ] OneDrive/rclone upload documented or verified
- [ ] PM2 reload works with `ecosystem.config.js`
- [ ] No config secrets committed to GitHub

---

## Important Rules

1. **Never edit directly on VPS first.** Make changes locally, push to GitHub, then pull on VPS.
2. **Never restart PM2 until build passes.**
3. **Always create DB backup before deploy.**
4. **Keep old git commit hash for rollback.**
5. **Deploy during low-usage window if possible.**
6. **If build/test fails, STOP. Do not restart live PM2.**
7. **If post-deploy health check fails, rollback immediately.**
