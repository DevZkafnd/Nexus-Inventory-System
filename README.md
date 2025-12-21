# Nexus Inventory System

Sistem manajemen inventaris *hybrid* dengan Web Admin untuk pusat dan Mobile App (Flutter) untuk operasional gudang/cabang.

## 🌟 Fitur Utama

### 🖥️ Web Admin (Dashboard Pusat)
- **UI/UX Modern (Login Revamp)**: Antarmuka login bertema "Inventory Barcode" dengan animasi Liquid Ether yang elegan.
- **Monitoring Stok Real-time**: Pantau stok di semua gudang/cabang.
- **Manajemen Master Data**: Produk (SKU), Gudang, dan Staff.
- **Cetak QR Code**: Generate QR untuk produk dan aktivasi gudang staff.
- **Riwayat Transaksi**: Log detail barang masuk, keluar, dan transfer antar gudang.

### 📱 Mobile App (Staff Gudang)
- **Scan QR Code**: Operasional cepat menggunakan kamera HP.
- **Upload QR Image**: Dukungan upload gambar jika scan kamera tidak memungkinkan.
- **Barang Masuk (Outbound)**: Staff menerima barang dari Pusat (Stok Cabang bertambah).
- **Barang Keluar (Inbound)**: Staff mengeluarkan barang untuk penjualan (Stok Cabang berkurang).
- **Mutasi Stok (Transfer)**: Pindahkan barang ke gudang lain.
- **Aktivasi Mudah**: Staff cukup scan QR Gudang untuk mulai bekerja.

---

## 🚀 Cara Menjalankan (Quick Start)

### 1. Persiapan Backend (Docker)
Pastikan Docker Desktop sudah berjalan.

```bash
# Jalankan semua service (API, DB, Ngrok)
docker compose up -d
```

- **Backend API**: `http://localhost:4000`
- **Ngrok Public URL**: Buka `http://localhost:4040` untuk melihat URL publik (penting untuk akses Mobile).

### 2. Menjalankan Web Admin (React/Vite)
Lokasi: `client/web`

```bash
cd client/web
npm install
npm run dev
```
Akses di browser: `http://localhost:5173`

### 3. Menjalankan Mobile App (Flutter)
Lokasi: `client/mobile/mobile`

1.  Buka file `lib/config/graphql.dart`.
2.  Update variabel `_apiUrlDefine` dengan URL Ngrok yang Anda dapatkan (misal: `https://xxxx.ngrok-free.dev/`).
3.  Jalankan aplikasi:

```bash
# Untuk Debugging
flutter run

# Untuk Build APK (Siap Install di HP)
flutter build apk --release
```

File APK akan tersedia di: `build/app/outputs/flutter-apk/app-release.apk`

---

## 🔧 Struktur Proyek

- `backend/`: Node.js, Apollo Server, Prisma ORM, PostgreSQL.
- `client/web/`: React.js (Vite) Web Admin dengan UI modern & animasi kompleks.
- `client/mobile/mobile/`: Aplikasi Flutter untuk Android.

## 🛠️ Tech Stack

- **Backend**: Node.js v22, GraphQL, Prisma ORM.
- **Frontend Web**: React.js, Tailwind CSS, GSAP, WebGL (Three.js/GLSL shaders).
- **Database**: PostgreSQL 15.
- **Mobile**: Flutter SDK 3.32 (Dart), Mobile Scanner.
- **Tools**: Docker, Ngrok.

---

## 📝 Catatan Update Terakhir (22 Des 2025)

- **Login UI Overhaul**: Transformasi total halaman login menjadi tema "Secure Inventory Access".
  - **Visual**: Latar belakang animasi *Liquid Ether* (fluid simulation) + Grid Digital.
  - **Interaksi**: Animasi *Variable Proximity* pada teks (huruf membesar & memutih saat didekati kursor).
  - **Thematic**: Form login bergaya Barcode Scanner dengan efek laser beam pada input field.
  - **Lokalisasi**: Full Bahasa Indonesia untuk pengalaman pengguna lokal yang lebih baik.
- **Performance Optimization**: Optimasi rendering WebGL dan kalkulasi animasi teks untuk mencegah lag.
- **Bug Fixes**: Perbaikan refresh animasi saat input form dan penyesuaian ukuran kursor liquid.
