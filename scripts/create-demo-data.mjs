import { existsSync, readFileSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const KEY_LENGTH = 64;
const DEMO_TAP = 'TAP-DEMO';
const DEMO_USERNAME = 'sales.demo';
const DEMO_PASSWORD = 'DemoSales123';

function loadDotEnv() {
  if (!existsSync('.env')) return;
  const lines = readFileSync('.env', 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

loadDotEnv();

if (!process.env.DATABASE_URL) {
  console.error('[demo-seed] DATABASE_URL tidak ditemukan. Jalankan dari folder app VPS yang punya .env.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  await prisma.tap.upsert({
    where: { kode: DEMO_TAP },
    update: { nama: 'Demo Salesforce', isActive: true },
    create: { kode: DEMO_TAP, nama: 'Demo Salesforce', isActive: true },
  });

  await prisma.user.upsert({
    where: { username: DEMO_USERNAME },
    update: {
      nama: 'Salesforce Demo',
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: 'SALESFORCE',
      tap: DEMO_TAP,
      allowedTaps: [DEMO_TAP],
      isActive: true,
      mustChangePassword: true,
    },
    create: {
      nama: 'Salesforce Demo',
      username: DEMO_USERNAME,
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: 'SALESFORCE',
      tap: DEMO_TAP,
      allowedTaps: [DEMO_TAP],
      isActive: true,
      mustChangePassword: true,
    },
  });

  await prisma.outlet.upsert({
    where: { idOutlet: 'OUT-DEMO-001' },
    update: {
      nomorRS: 'RS-DEMO-001',
      namaOutlet: 'Outlet Demo Bandung',
      tap: DEMO_TAP,
      salesforceUsername: DEMO_USERNAME,
      kabupaten: 'Bandung',
      kecamatan: 'Coblong',
      isManual: true,
    },
    create: {
      idOutlet: 'OUT-DEMO-001',
      nomorRS: 'RS-DEMO-001',
      namaOutlet: 'Outlet Demo Bandung',
      tap: DEMO_TAP,
      salesforceUsername: DEMO_USERNAME,
      kabupaten: 'Bandung',
      kecamatan: 'Coblong',
      isManual: true,
    },
  });

  const products = [
    {
      kode: 'DEMO-PERDANA-5K',
      kategori: 'FISIK',
      namaProduk: 'Demo Perdana Telkomsel 5K',
      harga: 5000,
      isActive: true,
      isVirtualNominal: false,
      brand: null,
      adminFee: null,
      minNominal: null,
    },
    {
      kode: 'DEMO-VOUCHER-10K',
      kategori: 'FISIK',
      namaProduk: 'Demo Voucher Fisik 10K',
      harga: 10000,
      isActive: true,
      isVirtualNominal: false,
      brand: null,
      adminFee: null,
      minNominal: null,
    },
    {
      kode: 'DEMO-LINKAJA',
      kategori: 'VIRTUAL',
      namaProduk: 'Demo LinkAja Nominal Bebas',
      harga: 0,
      isActive: true,
      isVirtualNominal: true,
      brand: 'LINKAJA',
      adminFee: 2000,
      minNominal: 20000,
    },
    {
      kode: 'DEMO-FINPAY',
      kategori: 'VIRTUAL',
      namaProduk: 'Demo FinPay Nominal Bebas',
      harga: 0,
      isActive: true,
      isVirtualNominal: true,
      brand: 'FINPAY',
      adminFee: 0,
      minNominal: 20000,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { kode: product.kode },
      update: product,
      create: product,
    });
  }

  console.log('[demo-seed] Data demo siap.');
  console.log(`[demo-seed] Username: ${DEMO_USERNAME}`);
  console.log(`[demo-seed] Password awal: ${DEMO_PASSWORD}`);
  console.log('[demo-seed] User akan diminta ganti password saat login pertama.');
}

main()
  .catch((error) => {
    console.error('[demo-seed] Gagal membuat data demo:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
