# SalesTrack - Progress Pengerjaan

> Terakhir diperbarui: 30 April 2026

---

## Ringkasan

SalesTrack sekarang sudah menjadi aplikasi fullstack Next.js dengan backend API dan database MySQL melalui Prisma ORM. Data TAP, user, produk, outlet, transaksi, summary dashboard, laporan transaksi, dan workflow pembatalan tidak lagi disimpan di browser/local storage.

Aplikasi juga sudah dilengkapi manajemen data CSV, replace data double saat upload, assignment outlet per username Salesforce, laporan penjualan detail, summary admin, data demo lokal, dan loading lock saat proses upload berjalan.

---

## Backend Production

- Prisma schema untuk MySQL tersedia di `prisma/schema.prisma`
- Initial migration tersedia di `prisma/migrations/20260430100000_init`
- Migration master TAP tersedia di `prisma/migrations/20260430110000_add_taps`
- Migration assignment outlet ke Salesforce tersedia di `prisma/migrations/20260430120000_add_outlet_salesforce_username`
- Password user disimpan sebagai hash server-side
- Login memakai session cookie HttpOnly
- API backend tersedia untuk:
  - Setup admin awal
  - Login/logout/change password
  - Bootstrap data aplikasi
  - CRUD TAP, user, outlet, produk
  - Submit transaksi
  - Workflow pembatalan transaksi
- Master TAP tersedia di tabel `taps` dengan seed awal untuk TAP lama
- Perubahan kode TAP otomatis memperbarui `user.tap`, `allowedTaps`, dan `outlet.tap`
- Data outlet memiliki kolom `salesforceUsername` untuk menghubungkan outlet ke user Salesforce tertentu
- Identitas unik outlet saat upload/import memakai `idOutlet`, sehingga nama/nomor owner yang berubah akan memperbarui data outlet yang sama
- Saat upload master data menemukan data yang sama, data lama diganti dengan data baru sesuai value unik masing-masing master data
- Perubahan username user Salesforce otomatis ikut memperbarui assignment outlet yang memakai username lama
- Relasi transaksi ke user input (`salesforceId`) dipakai sebagai sumber keterangan siapa yang submit penjualan
- Submit transaksi melakukan validasi outlet dan produk di backend agar transaksi tidak dibuat dengan referensi data yang sudah tidak valid

---

## Frontend

- Zustand sekarang dipakai sebagai cache/state UI, bukan sumber data utama
- Semua data aplikasi dimuat dari backend API
- Halaman setup admin awal muncul jika database belum memiliki user
- Manajemen user, outlet, produk, transaksi, laporan, dan export CSV tetap berjalan
- Halaman `Kelola TAP` tersedia untuk Super Admin
- Semua halaman manajemen data (`Kelola TAP`, `Kelola Salesforce`, `Kelola Outlet`, `Kelola Produk`) memiliki download data CSV, upload data CSV dengan preview, dan template CSV yang bisa didownload
- Upload CSV dibuat lebih fleksibel:
  - Mendukung delimiter koma, titik koma, dan tab
  - Mendukung header dengan variasi penulisan/alias, termasuk spasi dan beda huruf besar-kecil
  - Mendukung nilai boolean seperti `true`, `ya`, `aktif`, dan angka `1`
  - Mendukung parsing angka harga walaupun memakai format ribuan/rupiah
  - Validasi duplikat dilakukan sebelum preview import
- Halaman `Kelola Outlet` memiliki kolom `salesforceUsername` di form, list, template CSV, upload CSV, dan download CSV
- User Salesforce hanya melihat outlet yang `salesforceUsername`-nya sesuai username login user tersebut
- Input penjualan memiliki opsi harga satuan manual per item
- Laporan penjualan menampilkan keterangan user yang input transaksi, termasuk role, username, dan nama user untuk admin
- Export laporan penjualan menyertakan kolom `Input Nama`, `Input Username`, dan `Input Role`
- Export laporan transaksi sudah dibuat detail per item, bukan hanya total per outlet
- Data yang ikut ter-download di laporan transaksi mencakup data submit utama: tanggal, status, TAP, outlet, ID outlet, owner, WA owner, Salesforce/input user, produk, kode produk, nomor seri/serial, kuantiti, harga jual, subtotal, dan total tagihan
- Dashboard admin memiliki tabel summary full-width yang bisa collapse/expand dengan urutan `Per TAP`, `Per Salesforce`, lalu `Per Produk`
- Summary admin `Per TAP` menampilkan jumlah transaksi, outlet unik, Salesforce unik, qty, omset, dan baris `Total 1 Cluster`
- Summary admin `Per Salesforce` memiliki kolom TAP terpisah setelah nama Salesforce
- Semua kolom tabel summary admin bisa diurutkan naik/turun, baik teks A-Z/Z-A maupun angka 0-9/9-0
- Default dashboard admin hanya membuka tabel `Per TAP`; tabel `Per Salesforce` dan `Per Produk` collapse sampai dibuka user
- Kartu transaksi di halaman laporan bisa diklik untuk membuka detail transaksi, sementara tombol aksi pembatalan tetap berjalan sendiri
- Tombol scroll-to-top tersedia di layout dashboard untuk halaman yang panjang
- Dropdown pencarian outlet di input penjualan bisa ditutup saat hasil outlet kosong melalui klik luar, tombol Escape, atau klik pesan kosong
- Saat proses upload/import dikonfirmasi, aplikasi menampilkan loading overlay full-screen dan mengunci halaman sampai upload selesai
- Loading lock upload juga menjaga tombol back browser dan memberi peringatan jika user mencoba reload/close tab saat upload berjalan

---

## Data Demo & Tutorial

- Script data demo tersedia melalui `npm run seed:demo`
- Data demo membuat akun latihan Salesforce `sales.demo` beserta dummy outlet dan produk untuk simulasi submit penjualan
- Tutorial video penggunaan Salesforce tersedia sebagai generator lokal di `public/tutorial-salesforce.html`
- Tutorial mencakup alur login awal, ganti password, pilih outlet, input produk, dan submit penjualan

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
- Alur update VPS tetap menjaga file `.env` dan konfigurasi server lokal karena update dilakukan dari Git tanpa menimpa file environment
- Aplikasi production sudah live di domain `sales.abkciraya.cloud`
- Update dari GitHub ke VPS dilakukan lewat `bash deploy.sh`, tanpa reset database dan tanpa seed ulang data production
- Perubahan terbaru dipush ke branch `main` untuk diambil VPS melalui deploy aman

---

## Verifikasi

- `npx tsc --noEmit` sukses setelah perubahan terbaru
- `npm run lint` sukses setelah perubahan terbaru
- `npm run build` sukses setelah perubahan terbaru
- Dev server lokal berhasil dijalankan di `http://localhost:3001`

---

## Gap Tersisa

- Import Excel native masih belum ada, saat ini memakai CSV
- Barcode scanner kamera belum diimplementasikan
- Webhook eksternal belum diimplementasikan
- Audit log detail belum diimplementasikan
- Tutorial video masih berupa generator HTML/WebM lokal, belum berupa file MP4 final di repository
