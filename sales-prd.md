# PRD — Aplikasi Input Penjualan Produk Telko
**Product Requirements Document (PRD)**
**Versi:** 1.0.0
**Tanggal:** April 2025
**Status:** Draft — Siap Development

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Tujuan & Sasaran Produk](#2-tujuan--sasaran-produk)
3. [Tech Stack & Infrastruktur](#3-tech-stack--infrastruktur)
4. [Desain & UI/UX](#4-desain--uiux)
5. [Arsitektur Sistem](#5-arsitektur-sistem)
6. [Skema Database](#6-skema-database)
7. [Role & Hak Akses](#7-role--hak-akses)
8. [Fitur & Alur Penggunaan](#8-fitur--alur-penggunaan)
9. [Spesifikasi Form Input Penjualan](#9-spesifikasi-form-input-penjualan)
10. [Dashboard & Laporan](#10-dashboard--laporan)
11. [Webhook Integration](#11-webhook-integration)
12. [API Endpoint](#12-api-endpoint)
13. [Keamanan](#13-keamanan)
14. [Deployment di VPS Ubuntu](#14-deployment-di-vps-ubuntu)
15. [Testing Checklist](#15-testing-checklist)
16. [Lampiran: Wireframe Deskriptif](#16-lampiran-wireframe-deskriptif)

---

## 1. Ringkasan Eksekutif

Aplikasi **SalesTrack** adalah platform web internal berbasis Next.js untuk mencatat dan mengelola penjualan produk telekomunikasi (virtual maupun fisik). Aplikasi dirancang dengan tampilan **mobile-first** menyerupai aplikasi mobile native, dapat diakses dari browser smartphone tanpa perlu instalasi.

Pengguna utama adalah tim Salesforce yang bekerja di lapangan, dengan supervisi dari Admin dan Super Admin di kantor.

---

## 2. Tujuan & Sasaran Produk

| No | Tujuan | Indikator Keberhasilan |
|----|--------|------------------------|
| 1 | Digitalisasi pencatatan penjualan produk telko | 100% input melalui sistem, nol pencatatan manual |
| 2 | Visibilitas real-time data penjualan per TAP | Dashboard terpantau dalam < 5 detik |
| 3 | Kontrol akses berbasis role | Setiap role hanya lihat data sesuai kewenangannya |
| 4 | Integrasi ke sistem eksternal via webhook | Notifikasi terkirim < 2 detik setelah transaksi |
| 5 | Laporan penjualan dapat diunduh Excel | Export tersedia di semua level role |

---

## 3. Tech Stack & Infrastruktur

### 3.1 Framework & Library

| Layer | Teknologi |
|-------|-----------|
| **Framework** | Next.js 14+ (App Router) |
| **Bahasa** | TypeScript |
| **Styling** | Tailwind CSS v3 |
| **UI Component** | shadcn/ui |
| **Database** | MySQL 8.x |
| **ORM** | Prisma ORM |
| **Autentikasi** | NextAuth.js v5 (credentials provider) |
| **Barcode Scanner** | `@zxing/library` atau `html5-qrcode` |
| **Excel Export** | `xlsx` (SheetJS) |
| **HTTP Client** | Axios |
| **Form Handling** | React Hook Form + Zod |
| **State Management** | Zustand |
| **Date Picker** | shadcn/ui Calendar + date-fns |
| **Toast/Notif** | shadcn/ui Sonner |
| **Icons** | Lucide React |

### 3.2 Server & Infrastruktur

| Komponen | Spesifikasi |
|----------|-------------|
| **OS Server** | Ubuntu 22.04 LTS |
| **Runtime** | Node.js 20 LTS |
| **Process Manager** | PM2 |
| **Web Server / Reverse Proxy** | Nginx |
| **Database Server** | MySQL 8.x (localhost atau remote) |
| **SSL** | Let's Encrypt (Certbot) |
| **Port Aplikasi** | 3000 (internal), 443/80 (public via Nginx) |

### 3.3 Struktur Folder Proyek

```
salestrack/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── layout.tsx           # Layout dengan bottom nav mobile
│   │   ├── dashboard/
│   │   ├── sales/
│   │   │   ├── new/             # Form input penjualan
│   │   │   └── [id]/            # Detail transaksi
│   │   ├── outlets/
│   │   ├── products/
│   │   └── users/
│   ├── api/
│   │   ├── auth/
│   │   ├── sales/
│   │   ├── outlets/
│   │   ├── products/
│   │   ├── users/
│   │   ├── export/
│   │   └── webhook/
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── layout/
│   │   ├── MobileHeader.tsx
│   │   ├── BottomNav.tsx
│   │   └── Sidebar.tsx
│   ├── sales/
│   │   ├── SalesForm.tsx
│   │   ├── ProductLineItem.tsx
│   │   ├── BarcodeScanner.tsx
│   │   └── ConfirmDialog.tsx
│   └── dashboard/
│       ├── SalesSummaryCard.tsx
│       ├── FilterBar.tsx
│       └── SalesTable.tsx
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── webhook.ts
│   └── excel.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── hooks/
│   ├── useBarcode.ts
│   └── useSales.ts
├── types/
│   └── index.ts
└── middleware.ts
```

---

## 4. Desain & UI/UX

### 4.1 Referensi Visual

Gaya visual mengacu pada platform telekomunikasi digital Indonesia dengan karakteristik:

- **Tampilan mobile-first**: Layout maks-lebar `max-w-md` (≈ 390px) di tengah layar, dengan background abu-abu gelap di luar kontainer pada desktop
- **Nuansa**: Modern, bersih, profesional dengan sentuhan brand telko
- **Komponen**: Card-based UI, bottom navigation bar, sticky header

### 4.2 Palet Warna

| Token | Nama | Hex | Penggunaan |
|-------|------|-----|-----------|
| `primary` | Merah Telko | `#E3000F` | CTA utama, aksen brand |
| `primary-dark` | Merah Gelap | `#B8000C` | Hover state primary |
| `secondary` | Navy | `#1A2B4A` | Header, sidebar, teks heading |
| `accent` | Oranye | `#FF6B00` | Badge, highlight, status aktif |
| `background` | Putih | `#FFFFFF` | Background card |
| `surface` | Abu Muda | `#F5F6FA` | Background halaman |
| `border` | Abu Border | `#E2E8F0` | Divider, border card |
| `text-primary` | Abu Gelap | `#1E293B` | Teks utama |
| `text-secondary` | Abu Medium | `#64748B` | Teks sekunder, label |
| `success` | Hijau | `#16A34A` | Status sukses |
| `warning` | Kuning | `#D97706` | Status warning |
| `error` | Merah Error | `#DC2626` | Error, validasi |

### 4.3 Tipografi

| Level | Font | Size | Weight |
|-------|------|------|--------|
| Heading 1 | Inter | 20px | 700 |
| Heading 2 | Inter | 16px | 600 |
| Body | Inter | 14px | 400 |
| Caption | Inter | 12px | 400 |
| Label Form | Inter | 13px | 500 |

### 4.4 Layout Mobile-First

```
┌─────────────────────────┐
│  [≡] SalesTrack  [👤]   │  ← Sticky Header (bg: navy)
├─────────────────────────┤
│                         │
│   CONTENT AREA          │  ← Scrollable
│   max-w-md mx-auto      │
│                         │
├─────────────────────────┤
│ [🏠] [➕] [📊] [⚙️]    │  ← Bottom Navigation Bar
└─────────────────────────┘
```

**Bottom Nav Items (per role):**

| Icon | Label | Route | Role |
|------|-------|-------|------|
| 🏠 | Beranda | `/dashboard` | Semua |
| ➕ | Input Sales | `/sales/new` | Salesforce, Admin |
| 📊 | Laporan | `/dashboard/report` | Semua |
| ⚙️ | Pengaturan | `/settings` | Super Admin, Admin |

### 4.5 Komponen UI Utama (shadcn/ui)

Gunakan komponen berikut dari shadcn/ui:

- `Dialog` — popup konfirmasi submit
- `Select` / `Combobox` — dropdown ID Outlet, Nama Produk
- `Input` — field teks
- `Button` — CTA
- `Card` — wadah konten
- `Badge` — status transaksi, kategori produk
- `Table` — daftar penjualan
- `DatePickerWithRange` — filter tanggal dashboard
- `Sheet` — side panel filter di mobile
- `Skeleton` — loading state
- `Sonner` (Toast) — notifikasi berhasil/gagal
- `Alert` — pesan error validasi

---

## 5. Arsitektur Sistem

```
┌──────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                  │
│           Next.js App Router + React + Tailwind       │
└────────────────────────┬─────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼─────────────────────────────┐
│                  NGINX Reverse Proxy                   │
│              (SSL Termination + Static)                │
└────────────────────────┬─────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────┐
│              Next.js Server (Port 3000)                │
│         App Router API Routes + Server Actions         │
│                  NextAuth Session                       │
└──────────┬──────────────────────────┬────────────────┘
           │                          │
┌──────────▼──────────┐   ┌──────────▼──────────────┐
│   MySQL Database     │   │   Webhook Dispatcher     │
│   (Prisma ORM)       │   │   (HTTP POST ke URL ext) │
└─────────────────────┘   └─────────────────────────┘
```

---

## 6. Skema Database

### 6.1 Prisma Schema Lengkap

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ─── ENUM ──────────────────────────────────────────
enum Role {
  SUPER_ADMIN
  ADMIN
  SALESFORCE
}

enum ProductCategory {
  VIRTUAL
  FISIK
}

enum TransactionStatus {
  DRAFT
  SUBMITTED
  CONFIRMED
  CANCELLED
}

// ─── USER ──────────────────────────────────────────
model User {
  id          String   @id @default(cuid())
  username    String   @unique
  nama        String
  password    String                         // bcrypt hash
  role        Role     @default(SALESFORCE)
  tap         String                         // Kode TAP / Lokasi Kantor
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relasi
  outlets         OutletSalesforce[]
  transactions    Transaction[]
  adminPermission AdminPermission?

  @@map("users")
}

// ─── ADMIN PERMISSION ──────────────────────────────
model AdminPermission {
  id              String  @id @default(cuid())
  userId          String  @unique
  user            User    @relation(fields: [userId], references: [id])
  canManageUsers  Boolean @default(false)
  canManageOutlets Boolean @default(false)
  canManageProducts Boolean @default(false)
  canViewAllTap   Boolean @default(false)    // true = lihat semua TAP, false = TAP sendiri
  canExportReport Boolean @default(true)

  @@map("admin_permissions")
}

// ─── PRODUK ────────────────────────────────────────
model Product {
  id            String          @id @default(cuid())
  kode          String          @unique                 // Kode produk internal
  kategori      ProductCategory
  namaProduk    String
  harga         Decimal         @db.Decimal(12, 2)
  isActive      Boolean         @default(true)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  // Relasi
  serialNumbers   SerialNumber[]
  transactionItems TransactionItem[]

  @@map("products")
}

// ─── SERIAL NUMBER ─────────────────────────────────
// Hanya untuk produk kategori FISIK
model SerialNumber {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  serialNumber String  @unique
  isUsed      Boolean  @default(false)
  usedAt      DateTime?
  transactionItemId String?

  @@index([productId])
  @@map("serial_numbers")
}

// ─── OUTLET ────────────────────────────────────────
model Outlet {
  id          String   @id @default(cuid())
  idOutlet    String   @unique                         // e.g. "OUT-001"
  nomorRS     String                                   // Nomor RS outlet
  namaOutlet  String
  tap         String                                   // Kode TAP
  kabupaten   String
  kecamatan   String
  isManual    Boolean  @default(false)                 // true = dibuat oleh Salesforce
  createdById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relasi
  salesforce      OutletSalesforce[]
  transactions    Transaction[]

  @@index([tap])
  @@map("outlets")
}

// ─── RELASI OUTLET ↔ SALESFORCE ────────────────────
model OutletSalesforce {
  id          String  @id @default(cuid())
  outletId    String
  outlet      Outlet  @relation(fields: [outletId], references: [id])
  userId      String
  user        User    @relation(fields: [userId], references: [id])

  @@unique([outletId, userId])
  @@map("outlet_salesforce")
}

// ─── TRANSAKSI (HEADER) ────────────────────────────
model Transaction {
  id              String            @id @default(cuid())
  nomorTransaksi  String            @unique              // Auto-generate: TRX-YYYYMMDD-XXXX
  outletId        String
  outlet          Outlet            @relation(fields: [outletId], references: [id])
  salesforceId    String
  salesforce      User              @relation(fields: [salesforceId], references: [id])
  status          TransactionStatus @default(SUBMITTED)
  totalTagihan    Decimal           @db.Decimal(12, 2)
  catatan         String?           @db.Text
  submittedAt     DateTime          @default(now())
  confirmedAt     DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  // Relasi
  items           TransactionItem[]
  webhookLogs     WebhookLog[]

  @@index([salesforceId])
  @@index([outletId])
  @@index([submittedAt])
  @@map("transactions")
}

// ─── ITEM TRANSAKSI (DETAIL / LINE ITEM) ────────────
model TransactionItem {
  id              String      @id @default(cuid())
  transactionId   String
  transaction     Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  productId       String
  product         Product     @relation(fields: [productId], references: [id])
  hargaSatuan     Decimal     @db.Decimal(12, 2)
  kuantiti        Int
  subTotal        Decimal     @db.Decimal(12, 2)
  snAwal          String?     // Serial Number awal (untuk produk fisik)
  snAkhir         String?     // Serial Number akhir (untuk produk fisik)
  serialNumbers   String?     @db.Text                  // JSON array SN (dari scan barcode)

  @@index([transactionId])
  @@map("transaction_items")
}

// ─── WEBHOOK LOG ───────────────────────────────────
model WebhookLog {
  id              String      @id @default(cuid())
  transactionId   String
  transaction     Transaction @relation(fields: [transactionId], references: [id])
  url             String
  payload         String      @db.Text                  // JSON payload yang dikirim
  responseCode    Int?
  responseBody    String?     @db.Text
  isSuccess       Boolean     @default(false)
  attemptCount    Int         @default(1)
  sentAt          DateTime    @default(now())

  @@index([transactionId])
  @@map("webhook_logs")
}

// ─── WEBHOOK CONFIG ────────────────────────────────
model WebhookConfig {
  id          String  @id @default(cuid())
  name        String
  url         String
  secret      String                                    // HMAC secret key
  isActive    Boolean @default(true)
  events      String  @db.Text                          // JSON: ["TRANSACTION_CREATED", ...]
  createdAt   DateTime @default(now())

  @@map("webhook_configs")
}
```

### 6.2 Catatan Database

- `DATABASE_URL` disimpan di file `.env` (tidak pernah di-commit ke git)
- Gunakan `prisma migrate deploy` untuk produksi
- Jalankan `prisma db seed` untuk data awal (super admin default)
- Index ditambahkan pada kolom yang sering di-query: `tap`, `salesforceId`, `submittedAt`

---

## 7. Role & Hak Akses

### 7.1 Matrix Akses

| Fitur | Super Admin | Admin | Salesforce |
|-------|:-----------:|:-----:|:----------:|
| Login | ✅ | ✅ | ✅ |
| Dashboard (semua TAP) | ✅ | ⚙️* | ❌ |
| Dashboard (TAP sendiri) | ✅ | ✅ | ✅ |
| Input penjualan | ✅ | ✅ | ✅ |
| Lihat transaksi (semua) | ✅ | ⚙️* | ❌ |
| Lihat transaksi (sendiri) | ✅ | ✅ | ✅ |
| Kelola produk (CRUD) | ✅ | ⚙️* | ❌ |
| Upload produk massal | ✅ | ⚙️* | ❌ |
| Kelola outlet (CRUD) | ✅ | ⚙️* | ❌ |
| Tambah outlet baru | ✅ | ✅ | ✅** |
| Kelola user (CRUD) | ✅ | ⚙️* | ❌ |
| Atur permission admin | ✅ | ❌ | ❌ |
| Export Excel | ✅ | ✅ | ✅ |
| Kelola webhook | ✅ | ❌ | ❌ |

> ⚙️* = tergantung izin yang diberikan Super Admin
> ✅** = Salesforce hanya bisa tambah outlet baru (tidak bisa edit/hapus)

### 7.2 Logic Tampilan Data

- **Super Admin**: Melihat semua data dari semua TAP
- **Admin**: Melihat data berdasarkan TAP yang sama, atau semua TAP jika `canViewAllTap = true`
- **Salesforce**: Hanya melihat transaksi dan outlet yang terkait dengan dirinya

### 7.3 Middleware Proteksi Route

```
/dashboard/*        → require: SUPER_ADMIN | ADMIN | SALESFORCE
/sales/new          → require: SUPER_ADMIN | ADMIN | SALESFORCE
/products/*         → require: SUPER_ADMIN | (ADMIN dengan canManageProducts)
/outlets/*          → require: SUPER_ADMIN | (ADMIN dengan canManageOutlets)
/users/*            → require: SUPER_ADMIN | (ADMIN dengan canManageUsers)
/settings/webhook   → require: SUPER_ADMIN
```

---

## 8. Fitur & Alur Penggunaan

### 8.1 Alur Login

```
User buka aplikasi
  └─► Halaman /login
        ├── Input: Username + Password
        ├── POST /api/auth/signin (NextAuth credentials)
        │     ├── Validasi di database
        │     ├── Cek isActive
        │     └── Buat session JWT
        └── Redirect berdasarkan role:
              ├── SUPER_ADMIN → /dashboard
              ├── ADMIN       → /dashboard
              └── SALESFORCE  → /dashboard
```

### 8.2 Alur Super Admin — Kelola Produk

```
Super Admin → Menu Produk
  ├── Lihat daftar produk (tabel dengan filter kategori)
  ├── Tambah produk manual:
  │     ├── Form: Kode, Kategori (Virtual/Fisik), Nama, Harga
  │     └── POST /api/products
  ├── Upload produk massal:
  │     ├── Download template Excel
  │     ├── Upload file .xlsx/.csv
  │     ├── Preview data sebelum import
  │     └── POST /api/products/upload
  ├── Edit produk → PATCH /api/products/:id
  └── Nonaktifkan produk → PATCH /api/products/:id/toggle
```

**Format Template Upload Produk:**

| Kode | Kategori | Nama Produk | Harga |
|------|----------|-------------|-------|
| VRT-001 | VIRTUAL | Saldo LinkAja 50rb | 50000 |
| FIS-001 | FISIK | Perdana Telkomsel | 5000 |

### 8.3 Alur Super Admin — Kelola User

```
Super Admin → Menu Users
  ├── Tambah user baru:
  │     ├── Form: Username, Nama, Password, Role, TAP
  │     └── POST /api/users
  ├── Edit user → PATCH /api/users/:id
  ├── Set permission Admin → PATCH /api/users/:id/permissions
  ├── Reset password → PATCH /api/users/:id/reset-password
  └── Nonaktifkan user → PATCH /api/users/:id/toggle
```

### 8.4 Alur Super Admin — Kelola Outlet

```
Super Admin → Menu Outlet
  ├── Tambah outlet manual (form)
  ├── Upload outlet massal:
  │     ├── Download template Excel
  │     ├── Upload → preview → import
  └── Assign Salesforce ke Outlet:
        └── Pilih user Salesforce → hubungkan ke outlet
```

**Format Template Upload Outlet:**

| ID Outlet | Nomor RS | Nama Outlet | TAP | Salesforce | Kabupaten | Kecamatan |
|-----------|----------|-------------|-----|------------|-----------|-----------|

### 8.5 Alur Salesforce — Input Penjualan

Lihat detail lengkap di **Bab 9**.

### 8.6 Alur Salesforce — Tambah Outlet Baru

```
Form Input Penjualan → Dropdown ID Outlet
  └── Outlet tidak ditemukan → klik "Tambah Outlet Baru"
        ├── Muncul modal form:
        │     ├── ID Outlet* (wajib, unik)
        │     ├── Nomor RS* (manual)
        │     ├── Nama Outlet* (manual)
        │     ├── Kabupaten*
        │     └── Kecamatan*
        ├── POST /api/outlets/manual
        │     ├── TAP otomatis = TAP user yang login
        │     ├── Salesforce otomatis = user yang login
        │     └── isManual = true
        └── Outlet langsung tersedia di dropdown
```

---

## 9. Spesifikasi Form Input Penjualan

### 9.1 Struktur Form

Form input penjualan terdiri dari **dua bagian**:
1. **Header Transaksi** — informasi outlet (mengisi sekali per transaksi)
2. **Line Items Produk** — bisa menambah banyak produk dalam satu transaksi

### 9.2 Bagian A — Header Transaksi

#### Field 1: ID Outlet

```
Label     : ID Outlet *
Tipe      : Searchable Dropdown (Combobox)
Source    : GET /api/outlets?salesforceId={userId}
Filter    : Hanya outlet yang terassign ke user Salesforce yang login
Tampil    : ID Outlet + Nama Outlet
Placeholder: "Cari ID Outlet..."
Aksi tambahan: Tombol "+ Tambah Outlet Baru" di bawah dropdown
```

#### Field 2: Nomor RS *(Auto-fill)*

```
Label     : Nomor RS
Tipe      : Text (readonly)
Sumber    : Lookup otomatis dari ID Outlet yang dipilih
Tampil    : Nomor RS sesuai data outlet
Style     : Input dengan background abu-abu (disabled state)
```

#### Field 3: Nama Outlet *(Auto-fill)*

```
Label     : Nama Outlet
Tipe      : Text (readonly)
Sumber    : Lookup otomatis dari ID Outlet yang dipilih
Style     : Input dengan background abu-abu (disabled state)
```

### 9.3 Bagian B — Line Items Produk

Setiap baris produk berisi field berikut:

#### Field 4: Nama Produk

```
Label     : Nama Produk *
Tipe      : Searchable Dropdown (Combobox)
Source    : GET /api/products?isActive=true
Group     : Dikelompokkan per Kategori (Virtual / Fisik)
Placeholder: "Cari produk..."
```

#### Field 5: Harga *(Auto-fill)*

```
Label     : Harga Satuan
Tipe      : Text (readonly + formatted)
Sumber    : Lookup otomatis dari produk yang dipilih
Format    : Rp X.XXX (contoh: Rp 50.000)
Style     : Input disabled
```

#### Field 6: Kuantiti

```
Label     : Kuantiti *
Tipe      : Number input
Min       : 1
Default   : 1
Catatan   : Jika Serial Number diisi via rentang SN, kuantiti otomatis dihitung
```

#### Field 7: Serial Number *(hanya produk FISIK)*

Ditampilkan hanya jika produk kategori `FISIK`. Tersedia **dua mode input**:

**Mode A — Scan Barcode/QR Code:**

```
Tombol    : [📷 Scan Barcode]
Aksi      : Aktifkan kamera → scan QR/Barcode menggunakan @zxing/library
Hasil     : SN tertambah ke list, kuantiti otomatis +1
List SN   : Tampil chip/badge per SN, bisa dihapus satu-satu
```

**Mode B — Input Rentang SN:**

```
Label SN Awal  : "SN Awal" (input teks)
Label SN Akhir : "SN Akhir" (input teks)
Tombol         : [Hitung Kuantiti]
Logika         : SN dianggap numerik berurutan
                 Kuantiti = (SN Akhir - SN Awal) + 1
                 Validasi: SN Akhir harus > SN Awal
Contoh         : SN Awal = "000001", SN Akhir = "000010" → Kuantiti = 10
```

> **Catatan:** User dapat pilih salah satu mode. Jika pakai Mode A, field SN Awal/SN Akhir disembunyikan. Jika pakai Mode B, tombol scan disembunyikan.

#### Field 8: Total Tagihan *(Auto-calculate)*

```
Label     : Total
Tipe      : Text (readonly)
Formula   : Harga Satuan × Kuantiti
Format    : Rp X.XXX.XXX
Update    : Real-time ketika harga atau kuantiti berubah
```

### 9.4 Aksi pada Line Items

```
[+ Tambah Produk]   → Tambah baris line item baru
[🗑 Hapus]          → Hapus baris line item tertentu
```

### 9.5 Footer Form

```
Grand Total : Jumlah semua subTotal line items (auto-sum)
Catatan     : Textarea opsional (max 500 karakter)
[Submit]    : Tombol submit utama (warna primary merah)
```

### 9.6 Popup Konfirmasi Sebelum Submit

Ketika user klik **[Submit]**, muncul Dialog konfirmasi:

```
┌─────────────────────────────┐
│  Konfirmasi Transaksi       │
│ ─────────────────────────── │
│  Outlet : [Nama Outlet]     │
│  ─────────────────────────  │
│  [Nama Produk 1]            │
│   Qty: X  ×  Rp XX.XXX     │
│   Subtotal: Rp XX.XXX       │
│  ─────────────────────────  │
│  [Nama Produk 2]            │
│   Qty: X  ×  Rp XX.XXX     │
│   Subtotal: Rp XX.XXX       │
│  ─────────────────────────  │
│  TOTAL : Rp XXX.XXX         │
│                             │
│  [Batal]    [✅ Konfirmasi]  │
└─────────────────────────────┘
```

Setelah konfirmasi:
1. POST ke `/api/sales/transactions`
2. Trigger webhook (async, tidak blocking UI)
3. Tampilkan Toast sukses: "Transaksi berhasil disimpan"
4. Redirect ke halaman detail transaksi

### 9.7 Validasi Form

| Field | Aturan Validasi |
|-------|----------------|
| ID Outlet | Wajib dipilih |
| Nama Produk | Wajib dipilih (min 1 produk) |
| Kuantiti | Wajib, min 1, integer |
| SN (Fisik, Mode B) | SN Akhir ≥ SN Awal, format numerik |
| SN (Fisik, Mode A) | Min 1 SN terscan |
| Total | Otomatis, tidak bisa 0 |

---

## 10. Dashboard & Laporan

### 10.1 Kartu Ringkasan (Summary Cards)

Tampilkan di bagian atas dashboard:

```
┌────────────┐ ┌────────────┐ ┌────────────┐
│ 📦          │ │ 💰          │ │ 🏪          │
│ Total Trx  │ │ Total Omset│ │ Outlet     │
│   XXX      │ │ Rp X.XXX   │ │    XX      │
└────────────┘ └────────────┘ └────────────┘
```

### 10.2 Filter Dashboard

| Filter | Tipe | Keterangan |
|--------|------|-----------|
| Tanggal | DatePicker Range | Default: hari ini |
| Salesforce | Dropdown (Admin/SuperAdmin) | Filter berdasarkan nama user |
| TAP | Dropdown (SuperAdmin) | Filter per kantor/area |
| Kategori Produk | Toggle | Virtual / Fisik / Semua |
| Status | Multi-select | Submitted / Confirmed / Cancelled |

### 10.3 Tabel Penjualan

Kolom tabel dashboard:

| # | Nomor Transaksi | Tanggal | Salesforce | TAP | Outlet | Produk | Qty | Total | Status | Aksi |
|---|-----------------|---------|------------|-----|--------|--------|-----|-------|--------|------|

- Klik baris → halaman detail transaksi
- Pagination: 20 baris per halaman
- Sort: Klik header kolom

### 10.4 Export Excel

Tombol **[⬇️ Export Excel]** tersedia di pojok kanan atas dashboard.

**Format file Excel yang dihasilkan:**

**Sheet 1: Ringkasan**
| Periode | Total Transaksi | Total Omset | Total Produk Terjual |

**Sheet 2: Detail Transaksi**
| No | Nomor Transaksi | Tanggal & Jam | Salesforce | TAP | ID Outlet | Nomor RS | Nama Outlet | Kabupaten | Kecamatan | Nama Produk | Kategori | Qty | Harga Satuan | Subtotal | SN Awal | SN Akhir | Status |

**Sheet 3: Rekap per Produk**
| Nama Produk | Kategori | Total Qty | Total Omset |

**Sheet 4: Rekap per Salesforce**
| Nama Salesforce | TAP | Total Transaksi | Total Omset |

Endpoint: `GET /api/export/excel?startDate=...&endDate=...&salesforceId=...&tap=...`

---

## 11. Webhook Integration

### 11.1 Konfigurasi Webhook

Super Admin dapat menambahkan satu atau lebih webhook endpoint di menu **Pengaturan > Webhook**.

Field konfigurasi:
- **Nama**: Label deskriptif
- **URL**: Endpoint tujuan (HTTPS direkomendasikan)
- **Secret Key**: Untuk HMAC signature verification
- **Events**: Pilih event yang di-trigger
- **Status**: Aktif / Nonaktif

### 11.2 Events yang Tersedia

| Event | Trigger |
|-------|---------|
| `TRANSACTION_CREATED` | Transaksi baru berhasil disimpan |
| `TRANSACTION_CONFIRMED` | Status transaksi diubah ke Confirmed |
| `TRANSACTION_CANCELLED` | Transaksi dibatalkan |
| `OUTLET_CREATED` | Outlet baru ditambahkan |

### 11.3 Format Payload

```json
{
  "event": "TRANSACTION_CREATED",
  "timestamp": "2025-04-15T10:30:00.000Z",
  "data": {
    "nomorTransaksi": "TRX-20250415-0001",
    "salesforce": {
      "id": "user_xyz",
      "nama": "Budi Santoso",
      "tap": "TAP-JKT-01"
    },
    "outlet": {
      "idOutlet": "OUT-001",
      "nomorRS": "RS-12345",
      "namaOutlet": "Warung Telko Maju",
      "kabupaten": "Jakarta Selatan",
      "kecamatan": "Tebet"
    },
    "items": [
      {
        "namaProduk": "Saldo LinkAja 50rb",
        "kategori": "VIRTUAL",
        "kuantiti": 2,
        "hargaSatuan": 50000,
        "subTotal": 100000
      },
      {
        "namaProduk": "Perdana Telkomsel",
        "kategori": "FISIK",
        "kuantiti": 5,
        "hargaSatuan": 5000,
        "subTotal": 25000,
        "snAwal": "00001",
        "snAkhir": "00005"
      }
    ],
    "totalTagihan": 125000,
    "status": "SUBMITTED"
  }
}
```

### 11.4 Keamanan Webhook (HMAC Signature)

Setiap request webhook menyertakan header:

```
X-SalesTrack-Signature: sha256=<HMAC-SHA256(secret, payload)>
X-SalesTrack-Event: TRANSACTION_CREATED
X-SalesTrack-Timestamp: 1713178200
```

Contoh verifikasi di sisi penerima (Node.js):

```javascript
const crypto = require('crypto');
const expectedSig = 'sha256=' + crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex');
if (signature !== expectedSig) return res.status(401).send('Unauthorized');
```

### 11.5 Retry Logic

- Jika response code bukan 2xx, retry maksimal **3 kali**
- Interval retry: 30 detik, 2 menit, 10 menit
- Semua percobaan dicatat di tabel `webhook_logs`

---

## 12. API Endpoint

### 12.1 Auth

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/signin` | Login (NextAuth) |
| POST | `/api/auth/signout` | Logout |

### 12.2 Outlets

| Method | Endpoint | Role | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/outlets` | Semua | List outlet (filtered by role) |
| GET | `/api/outlets/:id` | Semua | Detail outlet |
| POST | `/api/outlets` | SA, Admin | Tambah outlet |
| POST | `/api/outlets/manual` | SF | Tambah outlet manual (dari form) |
| PATCH | `/api/outlets/:id` | SA, Admin | Edit outlet |
| DELETE | `/api/outlets/:id` | SA | Hapus outlet |
| POST | `/api/outlets/upload` | SA, Admin | Upload massal (Excel/CSV) |
| GET | `/api/outlets/template` | SA, Admin | Download template Excel |

### 12.3 Products

| Method | Endpoint | Role | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/products` | Semua | List produk aktif |
| GET | `/api/products/:id` | Semua | Detail produk |
| POST | `/api/products` | SA, Admin | Tambah produk |
| PATCH | `/api/products/:id` | SA, Admin | Edit produk |
| PATCH | `/api/products/:id/toggle` | SA | Aktif/nonaktif produk |
| POST | `/api/products/upload` | SA, Admin | Upload massal |
| GET | `/api/products/template` | SA, Admin | Download template |

### 12.4 Transaksi

| Method | Endpoint | Role | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/sales/transactions` | Semua | List transaksi (filtered) |
| GET | `/api/sales/transactions/:id` | Semua | Detail transaksi |
| POST | `/api/sales/transactions` | Semua | Buat transaksi baru |
| PATCH | `/api/sales/transactions/:id/confirm` | SA, Admin | Konfirmasi transaksi |
| PATCH | `/api/sales/transactions/:id/cancel` | SA, Admin | Batalkan transaksi |

**Query params untuk GET list transaksi:**
```
?startDate=2025-01-01
&endDate=2025-01-31
&salesforceId=user_xyz
&tap=TAP-JKT-01
&status=SUBMITTED
&page=1
&limit=20
```

### 12.5 Users

| Method | Endpoint | Role | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/users` | SA, Admin | List users |
| GET | `/api/users/:id` | SA, Admin | Detail user |
| POST | `/api/users` | SA | Buat user baru |
| PATCH | `/api/users/:id` | SA, Admin | Edit user |
| PATCH | `/api/users/:id/permissions` | SA | Set admin permissions |
| PATCH | `/api/users/:id/toggle` | SA | Aktif/nonaktif user |
| PATCH | `/api/users/:id/reset-password` | SA | Reset password user |

### 12.6 Export & Dashboard

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/export/excel` | Export Excel dengan filter |
| GET | `/api/dashboard/summary` | Ringkasan KPI |

### 12.7 Webhook

| Method | Endpoint | Role | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/webhook/configs` | SA | List konfigurasi webhook |
| POST | `/api/webhook/configs` | SA | Tambah webhook |
| PATCH | `/api/webhook/configs/:id` | SA | Edit webhook |
| DELETE | `/api/webhook/configs/:id` | SA | Hapus webhook |
| GET | `/api/webhook/logs` | SA | Log pengiriman webhook |
| POST | `/api/webhook/test/:id` | SA | Test kirim webhook |

---

## 13. Keamanan

### 13.1 Autentikasi & Sesi

- Gunakan **NextAuth.js** dengan `credentials` provider
- Password di-hash dengan **bcrypt** (salt rounds: 12)
- Session menggunakan **JWT** (disimpan di HttpOnly cookie)
- Session expired: **8 jam** (dapat dikonfigurasi)
- Setelah 5x salah password → akun terkunci sementara 15 menit

### 13.2 Proteksi API

- Semua API route diproteksi dengan `getServerSession()` di middleware
- Validasi role di setiap endpoint yang memerlukan akses khusus
- Rate limiting: 100 request/menit per IP (gunakan `next-rate-limit` atau Nginx)

### 13.3 Validasi Input

- Semua input server divalidasi menggunakan **Zod** schema
- Sanitasi input untuk mencegah SQL injection (Prisma ORM sudah handle)
- File upload: validasi MIME type + ukuran maksimal 5MB

### 13.4 Variabel Lingkungan

File `.env` yang dibutuhkan:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/salestrack"

# NextAuth
NEXTAUTH_SECRET="generate-random-32-char-string"
NEXTAUTH_URL="https://yourdomain.com"

# App
APP_NAME="SalesTrack"
APP_URL="https://yourdomain.com"

# Default Super Admin (untuk seeding)
SEED_ADMIN_USERNAME="superadmin"
SEED_ADMIN_PASSWORD="GantiPassword123!"
SEED_ADMIN_TAP="PUSAT"
```

---

## 14. Deployment di VPS Ubuntu

### 14.1 Prasyarat Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install MySQL 8
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

### 14.2 Setup Database

```sql
-- Login sebagai root MySQL
CREATE DATABASE salestrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'salestrack_user'@'localhost' IDENTIFIED BY 'StrongPassword!';
GRANT ALL PRIVILEGES ON salestrack.* TO 'salestrack_user'@'localhost';
FLUSH PRIVILEGES;
```

### 14.3 Deploy Aplikasi

```bash
# Clone / upload project ke server
cd /var/www
git clone https://github.com/yourorg/salestrack.git
cd salestrack

# Install dependencies
npm install

# Buat .env
cp .env.example .env
nano .env  # isi semua variabel

# Generate Prisma client
npx prisma generate

# Jalankan migrasi
npx prisma migrate deploy

# Seed data awal (super admin default)
npx prisma db seed

# Build Next.js
npm run build

# Jalankan dengan PM2
pm2 start npm --name "salestrack" -- start
pm2 save
pm2 startup  # auto-start on reboot
```

### 14.4 Konfigurasi Nginx

```nginx
# /etc/nginx/sites-available/salestrack
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    # File upload max size
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Aktifkan site
sudo ln -s /etc/nginx/sites-available/salestrack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL Certificate
sudo certbot --nginx -d yourdomain.com
```

### 14.5 Perintah Maintenance

```bash
# Deploy update
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart salestrack

# Monitor logs
pm2 logs salestrack
pm2 monit

# Backup database
mysqldump -u salestrack_user -p salestrack > backup_$(date +%Y%m%d).sql
```

---

## 15. Testing Checklist

### 15.1 Autentikasi

- [ ] Login berhasil dengan kredensial benar
- [ ] Login gagal dengan password salah, tampil pesan error
- [ ] Redirect sesuai role setelah login
- [ ] Session expired setelah 8 jam
- [ ] Logout berhasil dan session dihapus
- [ ] Route terproteksi tidak bisa diakses tanpa login

### 15.2 Form Input Penjualan

- [ ] Dropdown ID Outlet hanya tampil outlet milik Salesforce yang login
- [ ] Nomor RS dan Nama Outlet auto-fill saat outlet dipilih
- [ ] Harga auto-fill saat produk dipilih
- [ ] Kuantiti minimal 1
- [ ] Scan barcode berhasil mengisi SN dan increment kuantiti
- [ ] Mode rentang SN: kuantiti terhitung otomatis
- [ ] Bisa tambah lebih dari 1 produk per transaksi
- [ ] Bisa hapus baris produk
- [ ] Total tagihan terhitung benar (harga × qty)
- [ ] Grand total adalah jumlah semua line items
- [ ] Popup konfirmasi muncul sebelum submit
- [ ] Transaksi tersimpan setelah konfirmasi
- [ ] Form direset setelah transaksi berhasil

### 15.3 Tambah Outlet Baru (Salesforce)

- [ ] Modal tambah outlet muncul dengan benar
- [ ] Outlet tersimpan dengan data manual
- [ ] Outlet langsung tersedia di dropdown setelah disimpan
- [ ] TAP otomatis sesuai Salesforce yang login

### 15.4 Dashboard & Export

- [ ] Filter tanggal bekerja dengan benar
- [ ] Filter salesforce/TAP bekerja (Admin/SuperAdmin)
- [ ] Data terupdate real-time sesuai filter
- [ ] Export Excel menghasilkan file dengan 4 sheet yang benar
- [ ] File Excel berisi semua kolom yang ditentukan
- [ ] Data Excel sesuai dengan filter yang aktif

### 15.5 Manajemen Produk & Outlet

- [ ] Upload Excel produk berhasil (format benar)
- [ ] Upload Excel gagal dengan pesan error (format salah)
- [ ] Preview data sebelum import tampil
- [ ] Produk berhasil dinonaktifkan
- [ ] Produk nonaktif tidak muncul di dropdown form

### 15.6 Webhook

- [ ] Webhook terkirim setelah transaksi dibuat
- [ ] HMAC signature valid
- [ ] Log tercatat di database
- [ ] Retry berjalan jika endpoint gagal
- [ ] Test webhook dari halaman settings berhasil

### 15.7 Responsif Mobile

- [ ] Tampilan sesuai di iPhone SE (375px)
- [ ] Tampilan sesuai di iPhone 14 Pro (393px)
- [ ] Tampilan sesuai di Samsung Galaxy S21 (360px)
- [ ] Bottom navigation terlihat dan berfungsi
- [ ] Modal/popup tidak terpotong di layar kecil
- [ ] Keyboard mobile tidak menutup field aktif (scroll ke atas)
- [ ] Barcode scanner berfungsi di kamera mobile

---

## 16. Lampiran: Wireframe Deskriptif

### 16.1 Halaman Login

```
┌─────────────────────────┐
│                         │
│      [LOGO APP]         │
│      SalesTrack         │
│                         │
│  ┌───────────────────┐  │
│  │ Username          │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ Password      👁   │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │   MASUK           │  │  ← Tombol merah (primary)
│  └───────────────────┘  │
│                         │
└─────────────────────────┘
```

### 16.2 Halaman Dashboard

```
┌─────────────────────────┐
│ [≡] SalesTrack   [👤]   │  ← Sticky header navy
├─────────────────────────┤
│ Halo, Budi 👋           │
│ Kamis, 15 April 2025    │
├─────────────────────────┤
│ [Filter Tanggal 📅] [▼] │
├─────────────────────────┤
│ ┌─────────┐ ┌─────────┐ │
│ │ 📦 125  │ │ 💰 12,5M│ │
│ │ Transaksi│ │  Omset  │ │
│ └─────────┘ └─────────┘ │
├─────────────────────────┤
│ Transaksi Terbaru       │
│ ┌───────────────────────┐│
│ │TRX-001 | Warung Maju  ││
│ │Rp 125.000 | SUBMITTED ││
│ └───────────────────────┘│
│ ┌───────────────────────┐│
│ │TRX-002 | Toko Sejahtera││
│ │Rp 75.000  | CONFIRMED ││
│ └───────────────────────┘│
│ [Lihat Semua →]         │
├─────────────────────────┤
│ [🏠] [➕] [📊] [⚙️]    │  ← Bottom nav
└─────────────────────────┘
```

### 16.3 Halaman Form Input Penjualan

```
┌─────────────────────────┐
│ ← Input Penjualan       │
├─────────────────────────┤
│ ID OUTLET *             │
│ ┌───────────────────┐   │
│ │ Cari ID Outlet ▼  │   │
│ └───────────────────┘   │
│ + Tambah Outlet Baru    │
│                         │
│ NOMOR RS                │
│ ┌───────────────────┐   │
│ │ RS-12345 (auto)   │   │
│ └───────────────────┘   │
│                         │
│ NAMA OUTLET             │
│ ┌───────────────────┐   │
│ │ Warung Maju (auto)│   │
│ └───────────────────┘   │
│ ─────────────────────── │
│ PRODUK 1         [🗑️]  │
│                         │
│ NAMA PRODUK *           │
│ ┌───────────────────┐   │
│ │ Cari Produk ▼     │   │
│ └───────────────────┘   │
│                         │
│ HARGA SATUAN            │
│ ┌───────────────────┐   │
│ │ Rp 50.000 (auto)  │   │
│ └───────────────────┘   │
│                         │
│ KUANTITI                │
│ ┌───────────────────┐   │
│ │ 1                 │   │
│ └───────────────────┘   │
│                         │
│ SERIAL NUMBER (FISIK)   │
│ [📷 Scan Barcode]       │
│ ─── atau ───            │
│ SN Awal: [________]     │
│ SN Akhir:[________]     │
│                         │
│ TOTAL: Rp 50.000        │
│ ─────────────────────── │
│ [+ Tambah Produk]       │
│ ─────────────────────── │
│ GRAND TOTAL: Rp 50.000  │
│                         │
│ ┌───────────────────┐   │
│ │     SUBMIT        │   │
│ └───────────────────┘   │
└─────────────────────────┘
```

---

*Dokumen ini adalah PRD lengkap untuk pengembangan aplikasi SalesTrack.*
*Dibuat untuk kebutuhan vibe coding menggunakan Antigravity.*
*Revisi dokumen mengikuti perubahan kebutuhan bisnis.*

---

**Versi Dokumen:**

| Versi | Tanggal | Perubahan |
|-------|---------|-----------|
| 1.0.0 | April 2025 | Dokumen awal |
