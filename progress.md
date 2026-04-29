# SalesTrack - Progress Pengerjaan

> Terakhir diperbarui: 30 April 2026

---

## Ringkasan

SalesTrack sekarang sudah menjadi aplikasi fullstack Next.js dengan backend API dan database MySQL melalui Prisma ORM. Data user, produk, outlet, transaksi, dan workflow pembatalan tidak lagi disimpan di browser/local storage.

---

## Backend Production

- Prisma schema untuk MySQL tersedia di `prisma/schema.prisma`
- Initial migration tersedia di `prisma/migrations/20260430100000_init`
- Password user disimpan sebagai hash server-side
- Login memakai session cookie HttpOnly
- API backend tersedia untuk:
  - Setup admin awal
  - Login/logout/change password
  - Bootstrap data aplikasi
  - CRUD user, outlet, produk
  - Submit transaksi
  - Workflow pembatalan transaksi

---

## Frontend

- Zustand sekarang dipakai sebagai cache/state UI, bukan sumber data utama
- Semua data aplikasi dimuat dari backend API
- Halaman setup admin awal muncul jika database belum memiliki user
- Manajemen user, outlet, produk, transaksi, laporan, dan export CSV tetap berjalan
- Upload produk fisik memakai CSV dengan preview import

---

## Deployment

- `deploy.sh` otomatis:
  - Pull update dari GitHub
  - Install dependency
  - Validasi `.env`
  - Generate Prisma client
  - Jalankan `prisma migrate deploy`
  - Build Next.js
  - Cari port kosong dan start/restart PM2
- `.env.example` sudah tersedia untuk konfigurasi VPS

---

## Verifikasi

- `npx tsc --noEmit` sukses
- `npm run lint` sukses
- `npm run build` sukses

---

## Gap Tersisa

- Import Excel native masih belum ada, saat ini CSV
- Barcode scanner kamera belum diimplementasikan
- Webhook eksternal belum diimplementasikan
- Audit log detail belum diimplementasikan
