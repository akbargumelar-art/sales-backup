# SalesTrack - Progress Pengerjaan

> Terakhir diperbarui: 30 April 2026

---

## Ringkasan

Aplikasi saat ini sudah tidak memakai mock transaction, mock outlet, mock produk, atau akun demo bawaan. Data aplikasi disimpan persisten di browser melalui Zustand persist, sehingga cocok untuk demo operasional lokal tanpa backend.

Pada first run, aplikasi meminta setup admin awal. Setelah itu user, outlet, produk, dan transaksi dikelola dari UI aplikasi.

---

## Fitur Aktif

### Autentikasi
- Login memakai data user yang tersimpan di aplikasi
- Setup admin awal saat data user belum ada
- Ganti password tersimpan permanen
- Auth guard untuk route dashboard

### Dashboard dan Laporan
- Summary transaksi, omset, outlet aktif, dan produk terjual
- Filter tanggal, TAP, dan salesforce
- Workflow pembatalan transaksi Admin <-> Salesforce
- Export laporan CSV dari halaman laporan

### Input Penjualan
- Pilih outlet sesuai akses user
- Tambah outlet manual langsung dari form penjualan
- Dukungan produk virtual nominal dan produk fisik
- Validasi owner outlet
- Submit transaksi tersimpan permanen

### Kelola Produk
- Tambah dan edit produk
- Toggle aktif/nonaktif
- Dukungan konfigurasi produk virtual nominal
- Upload massal produk fisik via file CSV dengan preview import

### Kelola Outlet
- List, filter, tambah, dan edit outlet

### Kelola User
- List, filter, tambah, edit user
- Reset password user
- Atur akses TAP untuk admin/super admin

### Operasional
- `deploy.sh` untuk update aplikasi dari GitHub di VPS
- `npm run lint` dan `npm run build` lulus

---

## Catatan Teknis

- Penyimpanan data saat ini masih frontend-local persistence, belum database server
- Tidak ada dependensi Excel saat ini, import produk fisik menggunakan CSV
- Barcode scanner fisik masih belum diimplementasikan

---

## Gap yang Masih Tersisa

- Backend/database production
- Upload Excel native
- Scanner barcode kamera
- Audit log dan webhook
- Manajemen pengaturan aplikasi yang lebih lengkap
