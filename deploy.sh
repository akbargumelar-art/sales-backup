#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/sales-backup"
APP_NAME="sales-backup"
BRANCH="${1:-main}"
PORT_FILE=".deploy-port"
PORT_START="${PORT_START:-3000}"
PORT_END="${PORT_END:-3099}"

port_is_free() {
  local port="$1"
  node -e "
    const net = require('net');
    const port = Number(process.argv[1]);
    const server = net.createServer();
    server.once('error', () => process.exit(1));
    server.once('listening', () => server.close(() => process.exit(0)));
    server.listen(port, '0.0.0.0');
  " "${port}" >/dev/null 2>&1
}

find_free_port() {
  local port
  for port in $(seq "${PORT_START}" "${PORT_END}"); do
    if port_is_free "${port}"; then
      echo "${port}"
      return 0
    fi
  done
  return 1
}

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

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
  fi
  echo "[deploy] file .env belum dikonfigurasi"
  echo "[deploy] edit .env dan isi DATABASE_URL + NEXTAUTH_SECRET, lalu jalankan ulang bash deploy.sh"
  exit 1
fi

echo "[deploy] generate prisma client"
npx prisma generate

echo "[deploy] migrasi database"
npx prisma migrate deploy

echo "[deploy] build aplikasi"
npm run build

if command -v pm2 >/dev/null 2>&1; then
  APP_PORT="${PORT:-}"
  PM2_EXISTS=0
  if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
    PM2_EXISTS=1
  fi

  if [ -z "${APP_PORT}" ] && [ -f "${PORT_FILE}" ]; then
    APP_PORT="$(tr -dc '0-9' < "${PORT_FILE}" || true)"
  fi

  if [ -z "${APP_PORT}" ] || { [ "${PM2_EXISTS}" -eq 0 ] && ! port_is_free "${APP_PORT}"; }; then
    APP_PORT="$(find_free_port)" || {
      echo "[deploy] tidak menemukan port kosong pada range ${PORT_START}-${PORT_END}"
      exit 1
    }
  fi

  echo "${APP_PORT}" > "${PORT_FILE}"
  echo "[deploy] memakai port ${APP_PORT}"

  if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
    echo "[deploy] restart pm2 ${APP_NAME}"
    PORT="${APP_PORT}" pm2 restart "${APP_NAME}" --update-env
  else
    echo "[deploy] process pm2 belum ada, jalankan start baru"
    PORT="${APP_PORT}" pm2 start npm --name "${APP_NAME}" -- start
    pm2 save
  fi
else
  echo "[deploy] pm2 tidak ditemukan, start dilewati"
fi

echo "[deploy] selesai"
