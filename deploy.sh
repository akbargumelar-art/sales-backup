#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/sales-backup"
APP_NAME="sales-backup"
BRANCH="${1:-main}"

echo "[deploy] masuk ke ${APP_DIR}"
cd "${APP_DIR}"

if [ ! -d .git ]; then
  echo "[deploy] folder ini belum berupa git repository"
  exit 1
fi

echo "[deploy] sinkronisasi branch ${BRANCH}"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

echo "[deploy] install dependency"
npm install

echo "[deploy] build aplikasi"
npm run build

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
    echo "[deploy] restart pm2 ${APP_NAME}"
    pm2 restart "${APP_NAME}"
  else
    echo "[deploy] process pm2 belum ada, jalankan start baru"
    pm2 start npm --name "${APP_NAME}" -- start
    pm2 save
  fi
else
  echo "[deploy] pm2 tidak ditemukan, start dilewati"
fi

echo "[deploy] selesai"
