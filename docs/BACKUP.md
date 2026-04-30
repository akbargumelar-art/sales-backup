# Database Backup Guide — SalesTrack (sales-backup)

## Overview

The backup system creates compressed MySQL dumps only when the database has actually changed, avoiding duplicate backups. Backups are stored **outside** the application directory.

---

## How It Works

1. Runs `mysqldump` against the configured database
2. Compresses the dump with gzip (level 9)
3. Computes SHA256 hash of the compressed file
4. Compares against the last saved hash (`.latest.sha256`)
5. If hash matches → skip (no changes)
6. If hash differs → save backup, update hash, optionally upload to cloud
7. Prune backups older than retention period

---

## Configuration

Add these to your VPS `.env` file:

```env
# Required — backup storage location (must be outside /var/www/sales-backup)
SALES_BACKUP_DIR="/root/backups/sales-backup-db"

# Optional — rclone remote for cloud upload (e.g., OneDrive)
SALES_BACKUP_RCLONE_REMOTE=""

# Optional — days to keep local backups (default: 30)
SALES_BACKUP_RETENTION_DAYS="30"
```

### OneDrive Options

#### Option A — OneDrive Mounted/Synced Folder

If OneDrive is mounted on the VPS:

```env
SALES_BACKUP_DIR="/path/to/onedrive/Backups/sales-backup-db"
SALES_BACKUP_RCLONE_REMOTE=""
```

#### Option B — rclone Remote Upload

If OneDrive is configured as an rclone remote:

```env
SALES_BACKUP_DIR="/root/backups/sales-backup-db"
SALES_BACKUP_RCLONE_REMOTE="onedrive:Backups/sales-backup-db"
```

The script writes the local backup first, then uploads to the cloud remote.

> ⚠️ Do not commit real OneDrive paths to GitHub. Keep them in VPS `.env` only.

---

## Manual Usage

```bash
cd /var/www/sales-backup

# Run backup
npm run backup:db

# Check backup directory
ls -lah "$SALES_BACKUP_DIR"
```

### Expected Behavior

- **First run:** Creates `sales_backup-YYYYMMDD-HHmmss.sql.gz` and `.latest.sha256`
- **Second run (no DB changes):** Prints "No database changes detected; backup skipped."
- **After DB changes:** Creates a new timestamped backup file

---

## Automated Backups (systemd)

### Install Timer

```bash
sudo bash scripts/install-db-backup-systemd.sh
```

This creates:
- **Service:** `sales-backup-db-backup.service` — runs the backup script
- **Timer:** `sales-backup-db-backup.timer` — triggers daily at 02:15 AM (±10 min randomized delay)

### Verify

```bash
systemctl status sales-backup-db-backup.timer
systemctl list-timers | grep sales-backup
```

### Manual Test

```bash
systemctl start sales-backup-db-backup.service
journalctl -u sales-backup-db-backup.service -n 50 --no-pager
```

### View Logs

```bash
journalctl -u sales-backup-db-backup.service --since "24 hours ago"
```

---

## Backup File Format

```
sales_backup-20260430-021500.sql.gz
```

- Compressed mysqldump
- Named with timestamp: `YYYYMMDD-HHmmss`
- Accompanied by `.latest.sha256` hash file for change detection

---

## Restoring from Backup

```bash
# Decompress
gunzip -k sales_backup-20260430-021500.sql.gz

# Restore (CAUTION: this overwrites current database!)
mysql -u sales_user -p sales_backup < sales_backup-20260430-021500.sql
```

> ⚠️ **Always verify the backup file before restoring.** Test on a separate database first if possible.

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `mysqldump: command not found` | Install MySQL client: `apt install mysql-client` |
| `Access denied` | Check `DATABASE_URL` credentials in `.env` |
| `rclone: command not found` | Install rclone: `curl https://rclone.org/install.sh \| sudo bash` |
| Permission denied on backup dir | `mkdir -p /root/backups/sales-backup-db && chmod 700 /root/backups/sales-backup-db` |
| Timer not running | `systemctl enable --now sales-backup-db-backup.timer` |
