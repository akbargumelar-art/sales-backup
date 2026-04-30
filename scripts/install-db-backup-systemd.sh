#!/usr/bin/env bash
set -euo pipefail

# Install systemd timer for automated daily database backup.
# Run as root on VPS: sudo bash scripts/install-db-backup-systemd.sh

APP_DIR="/var/www/sales-backup"
NODE_BIN="$(command -v node)"

if [ -z "${NODE_BIN}" ]; then
  echo "❌ Node.js not found in PATH. Install Node.js first."
  exit 1
fi

echo "📝 Creating systemd service..."
cat >/etc/systemd/system/sales-backup-db-backup.service <<SERVICE
[Unit]
Description=Sales Backup DB backup if changed
After=network-online.target mysql.service

[Service]
Type=oneshot
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_BIN} ${APP_DIR}/scripts/backup-db-if-changed.mjs
User=root
Environment=NODE_ENV=production
SERVICE

echo "📝 Creating systemd timer..."
cat >/etc/systemd/system/sales-backup-db-backup.timer <<TIMER
[Unit]
Description=Run Sales Backup DB backup daily

[Timer]
OnCalendar=*-*-* 02:15:00
Persistent=true
RandomizedDelaySec=10m

[Install]
WantedBy=timers.target
TIMER

echo "🔄 Reloading systemd daemon..."
systemctl daemon-reload
systemctl enable --now sales-backup-db-backup.timer

echo ""
echo "✅ Systemd timer installed and enabled."
echo ""
echo "Verify with:"
echo "  systemctl status sales-backup-db-backup.timer"
echo "  systemctl list-timers | grep sales-backup"
echo ""
echo "Manual test:"
echo "  systemctl start sales-backup-db-backup.service"
echo "  journalctl -u sales-backup-db-backup.service -n 50 --no-pager"
echo ""

systemctl list-timers | grep sales-backup-db-backup || true
