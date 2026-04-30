#!/usr/bin/env node

/**
 * Database backup script for Sales Backup application.
 * Creates a mysqldump backup only when the database has changed (hash comparison).
 *
 * Usage: node scripts/backup-db-if-changed.mjs
 *
 * Environment variables (read from .env in working directory):
 *   DATABASE_URL                   - MySQL connection string (required)
 *   SALES_BACKUP_DIR               - Directory to store backups (default: /root/backups/sales-backup-db)
 *   SALES_BACKUP_RCLONE_REMOTE     - Optional rclone remote path for cloud upload
 *   SALES_BACKUP_RETENTION_DAYS    - Days to keep local backups (default: 30)
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

// ─── Simple .env parser (no external deps) ──────────────────────────────────

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

// ─── Load environment ────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dotenvVars = parseEnvFile(path.join(projectRoot, '.env'));

// Merge .env with process.env (process.env takes precedence)
const env = { ...dotenvVars, ...process.env };

const DATABASE_URL = env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Cannot proceed.');
  process.exit(1);
}

const BACKUP_DIR = env.SALES_BACKUP_DIR || '/root/backups/sales-backup-db';
const RCLONE_REMOTE = env.SALES_BACKUP_RCLONE_REMOTE || '';
const RETENTION_DAYS = parseInt(env.SALES_BACKUP_RETENTION_DAYS || '30', 10);

// ─── Parse DATABASE_URL ──────────────────────────────────────────────────────

let dbUrl;
try {
  dbUrl = new URL(DATABASE_URL);
} catch {
  console.error('❌ Invalid DATABASE_URL format.');
  process.exit(1);
}

const dbHost = dbUrl.hostname;
const dbPort = dbUrl.port || '3306';
const dbUser = decodeURIComponent(dbUrl.username);
const dbPass = decodeURIComponent(dbUrl.password);
const dbName = dbUrl.pathname.slice(1); // remove leading /

console.log(`📦 Backup target: ${dbName}@${dbHost}:${dbPort}`);
console.log(`📂 Backup directory: ${BACKUP_DIR}`);

// ─── Ensure backup directory exists ──────────────────────────────────────────

mkdirSync(BACKUP_DIR, { recursive: true });

// ─── Run mysqldump ───────────────────────────────────────────────────────────

console.log('🔄 Running mysqldump...');

const dumpArgs = [
  '-h', dbHost,
  '-P', dbPort,
  '-u', dbUser,
  '--single-transaction',
  '--quick',
  '--routines',
  '--triggers',
];

// Only add --set-gtid-purged=OFF if server supports it (skip for basic setups)
// This avoids errors on servers without GTID
const gtidCheck = spawnSync('mysqldump', ['--help'], {
  env: { ...process.env, MYSQL_PWD: dbPass },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const helpOutput = gtidCheck.stdout?.toString() || '';
if (helpOutput.includes('set-gtid-purged')) {
  dumpArgs.push('--set-gtid-purged=OFF');
}

dumpArgs.push(dbName);

const dump = spawnSync('mysqldump', dumpArgs, {
  env: { ...process.env, MYSQL_PWD: dbPass },
  stdio: ['ignore', 'pipe', 'pipe'],
  maxBuffer: 256 * 1024 * 1024, // 256 MB
});

if (dump.status !== 0) {
  const stderr = dump.stderr?.toString().trim() || 'Unknown error';
  console.error(`❌ mysqldump failed (exit ${dump.status}): ${stderr}`);
  process.exit(1);
}

const dumpData = dump.stdout;
if (!dumpData || dumpData.length === 0) {
  console.error('❌ mysqldump produced empty output.');
  process.exit(1);
}

console.log(`✅ Dump complete (${(dumpData.length / 1024).toFixed(1)} KB raw)`);

// ─── Gzip ────────────────────────────────────────────────────────────────────

const gzipped = gzipSync(dumpData, { level: 9 });
console.log(`📦 Compressed to ${(gzipped.length / 1024).toFixed(1)} KB`);

// ─── Hash comparison ─────────────────────────────────────────────────────────

const currentHash = createHash('sha256').update(gzipped).digest('hex');
const hashFile = path.join(BACKUP_DIR, '.latest.sha256');

if (existsSync(hashFile)) {
  const previousHash = readFileSync(hashFile, 'utf-8').trim();
  if (previousHash === currentHash) {
    console.log('✅ No database changes detected; backup skipped.');
    process.exit(0);
  }
}

// ─── Save backup ─────────────────────────────────────────────────────────────

const now = new Date();
const timestamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
  '-',
  String(now.getHours()).padStart(2, '0'),
  String(now.getMinutes()).padStart(2, '0'),
  String(now.getSeconds()).padStart(2, '0'),
].join('');

const backupFileName = `sales_backup-${timestamp}.sql.gz`;
const backupPath = path.join(BACKUP_DIR, backupFileName);

writeFileSync(backupPath, gzipped);
writeFileSync(hashFile, currentHash);

console.log(`✅ Backup saved: ${backupPath}`);
console.log(`   Hash: ${currentHash}`);

// ─── Optional rclone upload ──────────────────────────────────────────────────

if (RCLONE_REMOTE) {
  console.log(`☁️  Uploading to rclone remote: ${RCLONE_REMOTE}`);
  const rclone = spawnSync('rclone', ['copy', backupPath, RCLONE_REMOTE], {
    stdio: 'inherit',
    timeout: 300_000, // 5 min timeout
  });
  if (rclone.status === 0) {
    console.log('✅ Upload to rclone remote complete.');
  } else {
    console.warn(`⚠️  rclone upload failed (exit ${rclone.status}). Local backup is still saved.`);
  }
}

// ─── Prune old backups ───────────────────────────────────────────────────────

const cutoffMs = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
let pruned = 0;

try {
  const files = readdirSync(BACKUP_DIR);
  for (const file of files) {
    if (!file.startsWith('sales_backup-') || !file.endsWith('.sql.gz')) continue;
    const filePath = path.join(BACKUP_DIR, file);
    const stat = statSync(filePath);
    if (stat.mtimeMs < cutoffMs) {
      unlinkSync(filePath);
      pruned++;
    }
  }
} catch (err) {
  console.warn(`⚠️  Error pruning old backups: ${err.message}`);
}

if (pruned > 0) {
  console.log(`🗑️  Pruned ${pruned} backup(s) older than ${RETENTION_DAYS} days.`);
}

console.log('🎉 Backup process complete.');
