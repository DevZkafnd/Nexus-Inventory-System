# Status Aplikasi: Nexus Inventory System (Update per 15 Des 2025)

## 1. Ikhtisar
- Arsitektur Multi‑Client: Web Admin dan Mobile Staff berjalan di atas satu backend GraphQL.
- Infrastruktur container stabil, siap untuk integrasi aplikasi Mobile berbasis Dart/Flutter.
- Fitur inti: CRUD Produk (aman), Transaksi Stok, User Role (ADMIN/STAFF), Auth sederhana, QR Code operasional.

## 2. Infrastruktur & Deploy
- Docker Compose: `nexus-api` (backend) dan `nexus-db` (PostgreSQL) satu jaringan.
- Port: API GraphQL diekspos `4000:4000`.
- Image backend: `node:22-bookworm-slim` untuk stabilitas Prisma Node‑API (menghindari segfault di alpine).
- Env penting:
  - `DATABASE_URL`, `SHADOW_DATABASE_URL`
  - `PRISMA_CLIENT_ENGINE_TYPE=library`
  - `ADMIN_PASSWORD=admin1234`
- Startup backend:
  - Jalankan `prisma generate` dan `prisma db push`, kemudian `npm start`.
  - Healthcheck DB di compose memastikan urutan start yang aman.

## 3. Data Model (Prisma)
- Enum `Role`: `ADMIN`, `STAFF`.
- Model `User`: `id`, `email`, `name`, `role`, `passwordSalt`, `passwordHash`, relasi ke `UserWarehouse`.
- Model `UserWarehouse`: Many‑to‑Many (User—Warehouse) dengan unique pair `userId, warehouseId`.
- Model Produk, Gudang, Stok, Transaksi sudah aktif; `totalStock` dihitung dari `StockItem`.

## 4. GraphQL API
- Query:
  - `products`, `product(id)`, `warehouses`, `transactions(limit)`
  - `me`, `users`, `user(id)`
- Mutation:
  - Produk: `createProduct`, `updateProduct`, `deleteProduct`
  - Stok: `inboundStock`, `outboundStock`, `transferStock`
  - User: `createUser(email,name,role,password)`, `login(email,password)`
  - Assignment Staff: `assignStaffToWarehouse(userId,warehouseId)`, `unassignStaffFromWarehouse(...)`
- Field Resolver:
  - `Product.totalStock`: agregasi dari `StockItem`
  - `Warehouse.staffs`: daftar user `STAFF` yang di‑assign ke gudang

## 5. Autentikasi & Otorisasi
- Login sederhana:
  - Password di‑hash PBKDF2 (`sha256`, 120k iterasi) dengan salt unik per user.
  - `login` mengembalikan token `user.id` yang dikirim via header `x-user-id`.
- Admin seed:
  - Dibuat/diupdate otomatis: email `admin@contoh.com`, nama `Zaki Affandi`, role `ADMIN`, password `admin1234`.
- Sesi di client:
  - Token disimpan di `sessionStorage` per tab; dihapus saat `unload` untuk memaksa login ulang jika tab ditutup/direload.

## 6. Client Aplikasi
- Struktur direktori:
  - `client/web/` (Admin)
  - `client/mobile/` (Staff)
- Web Admin:
  - Login overlay wajib sebelum akses.
  - Tabel Produk: SKU, Nama, `totalStock`, aksi Edit/Delete/QR.
  - Form Create Produk (opsional set initial stock + gudang).
  - Tabel Gudang: menampilkan daftar Staff yang di‑assign.
  - QR Code:
    - Cetak langsung di halaman (JPG), hanya QR yang tercetak.
    - Tombol download JPG dengan nama file mengikuti produk/gudang.
- Mobile Staff (HTML POC, menuju Flutter):
  - Login Staff.
  - Assign ke gudang via input/scan code/ID gudang.
  - Pilih gudang ter‑assign.
  - Inbound/Outbound dengan SKU + Qty; stok otomatis bertambah/berkurang.
  - Catatan: Implementasi scanner akan diarahkan ke Flutter (rencana integrasi).

## 7. Aturan Bisnis Produk & Stok
- `totalStock` tidak dapat diedit manual; hanya berubah melalui transaksi:
  - `inboundStock`, `outboundStock`, `transferStock`.
- `createProduct` dapat menginisialisasi stok awal di gudang terpilih (mencatat transaksi `INITIAL_ADJUSTMENT`).
- `deleteProduct` menolak jika stok global masih tersedia.

## 8. Status & Rencana
- Status:
  - Backend stabil, segfault tertangani dengan base image Debian.
  - Web Admin siap operasional.
  - Mobile Staff POC siap, migrasi ke Dart/Flutter direncanakan.
- Rencana berikut:
  - Implementasi Flutter untuk mobile (scanner kamera, offline queue).
  - Pengetatan otorisasi: batasi operasi stok STAFF hanya di gudang ter‑assign.
  - JWT & cookie httpOnly untuk auth lebih kuat pada produksi.

## 9. Akses & Verifikasi
- API: `http://localhost:4000/`
- Uji cepat:
  - Login Admin (`admin@contoh.com` / `admin1234`) di `client/web/index.html`.
  - Buat produk, cetak QR SKU, lihat daftar staff per gudang.
  - Login Staff di `client/mobile/index.html`, assign gudang, inbound/outbound via SKU.
