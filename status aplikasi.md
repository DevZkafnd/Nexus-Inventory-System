# Status Aplikasi: Nexus Inventory System (Update per 22 Des 2025)

## 1. Ikhtisar
- **Arsitektur Multi‑Client**: Web Admin (Manajemen Pusat) dan Mobile Staff (Operasional Cabang) berjalan di atas satu backend GraphQL.
- **Backend**: Node.js + Prisma + PostgreSQL (Dockerized).
- **Web Admin**: React.js dengan UI High-Tech Inventory (WebGL Animations).
- **Mobile App**: Flutter (Android), fitur lengkap scan QR & manajemen stok.

## 2. Infrastruktur & Deploy
- **Docker Compose**: Menjalankan API, Database, dan Ngrok Tunnel secara otomatis.
- **Akses Publik**: Menggunakan Ngrok agar aplikasi mobile di jaringan 4G/5G bisa mengakses backend di localhost laptop.
- **Environment**:
  - Backend: `node:22-bookworm-slim`
  - Database: PostgreSQL (Alpine)
  - Tunnel: Ngrok (via Docker)

## 3. Fitur Utama & Logika Bisnis (Terbaru)
### A. Web Admin (Pusat) - **LOGIN REVAMP** ✨
- **Tema "Secure Inventory"**: Desain halaman login baru yang mencerminkan sistem keamanan gudang berteknologi tinggi.
- **Animasi Liquid Ether**: Latar belakang simulasi cairan interaktif (WebGL) dengan warna tema gelap (Hitam/Navy/Biru Muda) yang merespons gerakan mouse.
- **Variable Proximity Text**: Judul aplikasi memiliki efek interaktif; huruf membesar dan berubah menjadi putih terang saat kursor mendekat, menggunakan font `Roboto Flex`.
- **Barcode UI**:
  - Container form login menyerupai label barcode fisik.
  - Input field memiliki animasi "Laser Scan" saat diketik/difokuskan.
  - Tombol login dengan efek pengisian progress bar futuristik.
- **Lokalisasi**: Seluruh antarmuka login kini menggunakan Bahasa Indonesia baku ("ID AKSES", "KODE KEAMANAN", "MEMVERIFIKASI").

### B. Mobile App (Staff Cabang)
- **Aktivasi Wajib**: Staff baru harus scan QR Gudang untuk mulai bekerja.
- **Logika Stok (Perspektif User):**
  - **Outbound (Barang Masuk)**: Terima barang dari Gudang Utama/Supplier (Stok Cabang +, Stok Utama -).
  - **Inbound (Barang Keluar)**: Penjualan ke Customer (Stok Cabang -).
  - **Mutasi (Transfer)**: Pindahkan barang ke Gudang Lain.
- **Scanner Canggih**: Scan QR Real-time, Upload Gambar, Flash support.

## 4. Perbaikan Terkini (Bug Fixes & Optimizations)
### Web Admin
1.  **Variable Proximity Lag Fix**:
    - Mengoptimalkan kalkulasi jarak dengan *squared distance* (menghindari `Math.sqrt` di loop).
    - Menambahkan properti `will-change` CSS untuk memberi petunjuk pada browser.
    - Menggunakan *ref caching* untuk posisi huruf guna meminimalkan *reflow/repaint*.
2.  **Liquid Ether Stability**:
    - Memisahkan state animasi dari re-render form React (mencegah animasi reset saat mengetik email/password).
    - Penyesuaian shader untuk visibilitas optimal di latar gelap.
3.  **Font Consistency**:
    - Unifikasi penggunaan font `Roboto Flex` di seluruh komponen animasi (`SplitText` & `VariableProximity`) untuk transisi yang mulus.

### Mobile App
1.  **Fix Camera White Screen**: Penanganan error kamera dan restart controller otomatis.
2.  **Auto-Detect Gudang Utama**: Backend otomatis mengenali gudang pusat untuk sumber stok.

## 5. Cara Menjalankan (Quick Start)
### Backend
```bash
docker compose up -d
```
- API: `http://localhost:4000`
- Ngrok Public URL: Cek di `http://localhost:4040`

### Web Admin
```bash
cd client/web
npm run dev
```
- URL: `http://localhost:5173`

### Mobile (Flutter)
1.  Pastikan URL Ngrok di `lib/config/graphql.dart` sudah sesuai.
2.  Build & Run:
    ```bash
    cd client/mobile/mobile
    flutter run --release
    ```

## 6. Rencana Pengembangan Selanjutnya
- [ ] **Web Admin**: Implementasi dashboard utama dengan tema desain yang selaras (High-Tech/Grid UI).
- [ ] **Mobile**: Notifikasi Push untuk stok menipis.
- [ ] **Umum**: Mode Offline (Queue transaksi saat tidak ada internet).
