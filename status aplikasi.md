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

## 7. Alur Data Flow Detail
- **Autentikasi & Token**
  - Web: Login menghasilkan token lalu disimpan di localStorage dan state konteks. Lihat [AuthContext.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/context/AuthContext.jsx#L13-L22).
  - Mobile: Login menyimpan token di SharedPreferences. Lihat [login_screen.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/screens/login_screen.dart#L67-L73).
  - GraphQL Client: Inisialisasi client untuk koneksi backend. Web di [apollo.js](file:///d:/projekan/nexus-inventory-system/client/web/src/lib/apollo.js), mobile di [graphql.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/config/graphql.dart).

- **Produk: List, Buat, Ubah, Hapus**
  - List Produk: Web memanggil query products dan menampilkan stok per gudang. Lihat [Products.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Products.jsx#L5-L23) dan render tabel [Products.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Products.jsx#L232-L291).
  - Query & TypeDefs: Skema produk dan field totalStock/stocks. Lihat [product.graphql](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/product.graphql).
  - Buat Produk: Mutasi createProduct dari web memicu resolver, menambah produk dan (opsional) stok awal di gudang utama serta mencatat transaksi INITIAL_ADJUSTMENT. Lihat [product.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/product.ts#L64-L102).
  - Ubah/Hapus Produk: Mutasi updateProduct/deleteProduct memutakhirkan data dan menolak hapus jika masih ada stok. Lihat [product.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/product.ts#L103-L119).

- **Gudang & Stok**
  - Struktur Gudang dan relasi stok (StockItem). Lihat [warehouse.graphql](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/warehouse.graphql).
  - Query warehouses mengembalikan daftar gudang; field stocks dihitung via resolver untuk setiap gudang. Lihat [transaction.ts:Warehouse.stocks](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L28-L41).

- **Transaksi Stok (Inti Bisnis)**
  - Skema dan jenis transaksi: INBOUND, OUTBOUND, TRANSFER, INITIAL_ADJUSTMENT. Lihat [transaction.graphql](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/transaction.graphql).
  - Inbound (Staff ambil dari Gudang Utama): Mobile memicu inboundStock; server mengurangi stok di Gudang Utama dan menambah stok di gudang staff, lalu mencatat transaksi TRANSFER. Lihat tombol/form di [dashboard_screen.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/screens/dashboard_screen.dart#L90-L262) dan resolver [transaction.ts:inboundStock](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L137-L199).
  - Outbound (Barang keluar dari gudang staff): Mobile memicu outboundStock; server mengurangi stok dan jika stok gudang cabang menjadi 0 serta stok Gudang Utama juga 0, record stok cabang dihapus. Lihat [dashboard_screen.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/screens/dashboard_screen.dart#L264-L408) dan resolver [transaction.ts:outboundStock](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L199-L238).
  - Transfer (Mutasi antar gudang): Mobile memicu transferStock via scanner; server mengurangi stok sumber dan menambah stok tujuan, mencatat transaksi TRANSFER. Lihat alur scanner di [dashboard_screen.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/screens/dashboard_screen.dart#L410-L480) dan resolver [transaction.ts:transferStock](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L238-L305).
  - Query transaksi untuk riwayat (limit, urut terbaru). Lihat [transaction.ts:transactions](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L9-L21).

- **Dashboard & Visualisasi**
  - Web Dashboard menggunakan data products.totalStock dan transactions untuk membuat grafik Bar/Pie/Area. Lihat [Dashboard.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Dashboard.jsx#L116-L226).
  - Pengelompokan kategori, Top 5 produk, dan timeline aktivitas disusun di client dengan useMemo. Lihat [Dashboard.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Dashboard.jsx#L60-L105).

- **Polling & Penyegaran Data**
  - Web Products/Transactions menggunakan pollInterval untuk menyegarkan daftar secara berkala. Contoh di [Products.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Products.jsx#L64-L69) dan [Transactions.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Transactions.jsx#L33-L39).

- **Keamanan & Performa**
  - Token tidak dikirim ke UI selain disimpan lokal (localStorage/SharedPreferences); backend memvalidasi operasi via context userId bila tersedia. Lihat [user.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/user.ts#L1-L33) dan [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L60-L82).
  - Optimasi UI: animasi WebGL dipisah dari re-render form; hooks diperbaiki agar bebas dari lint error. Lihat [LiquidEther.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/components/LiquidEther.jsx).

## 8. Diagram Arsitektur & Data Flow

### 8.1 Arsitektur Tingkat-Tinggi

```
[Web Admin (React)] ----\
                         \        +--------------------+        +------------------+
                          ----->  | Apollo Server      | -----> | Prisma Client    | -----> [PostgreSQL]
[Mobile App (Flutter)] --/        | (Node.js, GraphQL) |        | (Adapter PG)     |       (Dockerized)
                                   +--------------------+        +------------------+
                                          ^     |
                                          |     v
                                   [Ngrok Tunnel] (opsional untuk akses publik)

[Docker Compose] mengorkestrasi: api, db, ngrok
```

- Web/Mobile menggunakan Apollo/GraphQL client untuk mengirim query/mutasi.
- Backend Apollo Server memproses resolver dan mengakses database via Prisma.
- Ngrok mengekspose endpoint lokal agar mobile dapat mengakses saat tidak satu jaringan.
- Docker Compose menjalankan semua layanan bersama.

### 8.2 Autentikasi (Login) — Sequence

```
Client (Web/Mobile)       Backend (GraphQL)                   Penyimpanan Lokal
      |  login(email,pwd)    |                                     |
      |--------------------->| validate, generate token             |
      |<---------------------| token:string                         |
      | save token           |                                     |
      | attach Authorization |                                     |
      | on next requests     |                                     |
```

- Web: token disimpan di localStorage melalui [AuthContext.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/context/AuthContext.jsx#L24-L33).
- Mobile: token disimpan di SharedPreferences melalui [login_screen.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/screens/login_screen.dart#L67-L73).
- Mutasi login didefinisikan pada [typeDefs/index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/index.ts#L24-L39) dan diimplementasi di [user.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/user.ts#L33).

### 8.3 Pembuatan Produk + Stok Awal

```
Web (Products.jsx)          Backend (productResolvers)             Database
    createProduct  ----->   create product row                      INSERT product
       (initialStock,       if initialStock > 0 & wId:              UPSERT stockItem(productId,wId)
        warehouseId)        create INITIAL_ADJUSTMENT transaction   INSERT transaction(type=INITIAL_ADJUSTMENT)
```

- Client: form kirim mutasi [Products.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Products.jsx#L149-L159).
- Server: logika di [product.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/product.ts#L64-L102).
- Skema tipe produk: [product.graphql](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/product.graphql).

### 8.4 Inbound (Ambil dari Gudang Utama ke Gudang Staff)

```
Mobile (Dashboard)       Backend (transactionResolvers)                                DB
inboundStock ----------> find Main Warehouse (code:'WH-GUDANG-UTAMA')                  SELECT warehouse
                         cek sumber stok cukup                                         SELECT stockItem
                         decrement stok di Main                                        UPDATE stockItem (decrement)
                         upsert stok di Gudang Staff                                   UPSERT stockItem (increment)
                         catat transaksi TRANSFER                                      INSERT transaction(type=TRANSFER)
```

- UI pemicu: [dashboard_screen.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/screens/dashboard_screen.dart#L90-L262).
- Resolver: [transaction.ts:inboundStock](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L137-L199).

### 8.5 Outbound (Barang Keluar dari Gudang Staff)

```
Mobile (Dashboard)       Backend (transactionResolvers)                           DB
outboundStock ---------> cek stok gudang cukup                                    SELECT stockItem
                         decrement stok                                            UPDATE stockItem (decrement)
                         jika stok cabang 0 dan stok Main 0: delete stok cabang   DELETE stockItem
                         catat transaksi OUTBOUND                                  INSERT transaction(type=OUTBOUND)
```

- UI pemicu: [dashboard_screen.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/screens/dashboard_screen.dart#L264-L408).
- Resolver: [transaction.ts:outboundStock](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L199-L238).

### 8.6 Transfer (Mutasi Antar Gudang)

```
Mobile (Scanner)         Backend (transactionResolvers)                            DB
transferStock ---------> cek stok gudang sumber                                    SELECT stockItem
                         decrement stok sumber                                     UPDATE stockItem (decrement)
                         jika stok sumber 0 & Main 0: delete stok sumber           DELETE stockItem
                         upsert stok tujuan                                        UPSERT stockItem (increment)
                         catat transaksi TRANSFER                                  INSERT transaction(type=TRANSFER)
```

- UI pemicu (Scanner & Dialog): [dashboard_screen.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/screens/dashboard_screen.dart#L410-L480).
- Resolver: [transaction.ts:transferStock](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L238-L305).

### 8.7 List Warehouse & Stok

```
Web Query: warehouses { stocks { quantity product { id name sku } } }
   |
   v
Resolver mengambil stok per gudang dan melengkapi relasi product/warehouse.
```

- Resolver: [transaction.ts:Warehouse.stocks](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L28-L41).
- TypeDefs: [warehouse.graphql](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/warehouse.graphql).

### 8.8 Dashboard (Grafik)

```
Web Dashboard:
query products, warehouses, transactions(limit:20)
useMemo:
- Kategori: agregasi totalStock per category
- Top 5: sort totalStock desc, ambil 5
- Aktivitas: group transaksi per tanggal (inbound/outbound)
Recharts render Bar/Pie/Area
```

- Implementasi: [Dashboard.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Dashboard.jsx#L60-L105) dan render grafik [Dashboard.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Dashboard.jsx#L139-L221).
- Query: [Dashboard.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Dashboard.jsx#L20-L39).

### 8.9 Polling & Penyegaran Data

```
Web:
Products/Transactions menggunakan pollInterval (1s/5s) untuk refresh real-time.
```

- Products: [Products.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Products.jsx#L64-L69).
- Transactions: [Transactions.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Transactions.jsx#L33-L39).

### 8.10 Skema Data (Ringkas, Prisma/GraphQL)

```
GraphQL Types:
- Product { id, sku, name, category, price, totalStock, stocks[] }
- Warehouse { id, name, location, code, capacity, stocks[], staffs[] }
- StockItem { product, warehouse, quantity }
- StockTransaction { id, type, product, sourceWarehouse, targetWarehouse, quantity, timestamp, referenceNote }
- User { id, email, name, role, warehouses[] }
```

- Definisi: [product.graphql](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/product.graphql), [warehouse.graphql](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/warehouse.graphql), [transaction.graphql](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/transaction.graphql), [user.graphql](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/user.graphql), root Query/Mutation [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/index.ts).
- Kunci gabungan stok: `productId_warehouseId` digunakan pada upsert/delete di resolver (lihat [transaction.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L160-L170)).

### 8.11 Docker Compose — Jalur Operasional

```
docker compose up -d
  -> container db (PostgreSQL)
  -> container api (Apollo Server)
  -> container ngrok (opsional)
Web: npm run dev  -> http://localhost:5173
API: Apollo       -> http://localhost:4000
Ngrok Dashboard   -> http://localhost:4040
```

- Backend entrypoint dan penggabungan typeDefs: [backend/src/index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L1-L20, file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L21-L39).
- Seed/playground dan contoh mutasi: [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L152-L193).

## 9. Deep Dive: GraphQL, Prisma, Docker

### 9.1 GraphQL: Skema, Resolver, Context
- **Penggabungan Skema**:
  - Root Query/Mutation digabung dengan definisi tipe domain. Lihat penggabungan di [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L31-L36) dan definisi root di [typeDefs/index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/index.ts#L1-L39).
- **Resolvers Terstruktur**:
  - Resolver dibagi per domain: produk, transaksi, pengguna. Digabung di satu objek `resolvers`. Lihat [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L61-L75).
  - Scalar `Date` disediakan untuk timestamp. Lihat [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L76-L82).
- **Context**:
  - Context menyertakan `prisma` dan `userId` dari header `x-user-id`. Lihat [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L214-L220).
  - Token/login di UI dipakai untuk navigasi/akses; backend contoh ini memakai header sederhana untuk `userId` saat development.
- **Query Penting**:
  - `products`: daftar produk, dengan field terkomputasi di resolver `Product` (totalStock/isLowStock) dan relasi `stocks`. Lihat [product.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/product.ts#L1-L49).
  - `warehouses`: daftar gudang; field `stocks` memuat stok per gudang dengan relasi produk. Lihat [transaction.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L1-L41).
  - `transactions(limit)`: daftar transaksi terbaru dengan opsi limit. Lihat [transaction.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L9-L21).
- **Mutation Penting**:
  - `createProduct`: buat produk, opsional stok awal + transaksi INITIAL_ADJUSTMENT. Lihat [product.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/product.ts#L64-L102).
  - `updateProduct`, `deleteProduct` (blok hapus bila stok masih ada). Lihat [product.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/product.ts#L103-L119).
  - `inboundStock`, `outboundStock`, `transferStock`: operasi inti stok dengan perubahan atomik dan pencatatan transaksi. Lihat [transaction.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L137-L305).
  - `createUser`, `login`: manajemen pengguna dasar. Lihat [user.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/user.ts).

### 9.2 Prisma: Model, Relasi, Transaksi
- **Model Inti**:
  - Product, Warehouse, StockItem, Transaction, User, UserWarehouse. Lihat skema lengkap di [schema.prisma](file:///d:/projekan/nexus-inventory-system/backend/prisma/schema.prisma#L21-L89).
- **Relasi Utama**:
  - StockItem menghubungkan Product–Warehouse, dengan composite unique `@@unique([productId, warehouseId])`. Lihat [schema.prisma](file:///d:/projekan/nexus-inventory-system/backend/prisma/schema.prisma#L45-L54).
  - Transaction menautkan product dan optional source/target warehouse (dua relasi bernama). Lihat [schema.prisma](file:///d:/projekan/nexus-inventory-system/backend/prisma/schema.prisma#L56-L68).
- **Transaksi Atomik**:
  - Operasi stok (inbound/outbound/transfer) dieksekusi dalam `prisma.$transaction` untuk konsistensi. Lihat inbound/outbound/transfer di [transaction.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L160-L170, file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L210-L238, file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L260-L305).
  - Pola upsert pada StockItem memastikan rekaman stok tujuan ada dan di-update bila perlu. Lihat [transaction.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L176-L185, file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L295-L299).
- **Kebijakan Penghapusan Rekaman Stok**:
  - Saat outbound/transfer menyebabkan stok sumber menjadi 0, dan stok di Gudang Utama juga 0, rekaman stok cabang dihapus untuk menjaga kebersihan data. Lihat outbound/transfer di [transaction.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L220-L238, file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L280-L305).
- **Normalisasi Harga**:
  - Harga disimpan sebagai `priceCents` (integer) untuk menghindari floating errors; konversi dilakukan saat update. Lihat [product.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/product.ts#L103-L115).

### 9.3 Docker: Layanan, Environment, Healthcheck
- **Services**:
  - `nexus-api`: Backend Apollo Server; menjalankan prisma generate + db push sebelum start. Lihat [docker-compose.yml](file:///d:/projekan/nexus-inventory-system/docker-compose.yml#L5-L18).
  - `nexus-db`: PostgreSQL dengan volume `pg_data`, healthcheck `pg_isready`. Lihat [docker-compose.yml](file:///d:/projekan/nexus-inventory-system/docker-compose.yml#L20-L36).
  - `ngrok`: Tunnel publik untuk backend; dashboard di port 4040. Lihat [docker-compose.yml](file:///d:/projekan/nexus-inventory-system/docker-compose.yml#L37-L48).
- **Environment Penting**:
  - `DATABASE_URL` menunjuk ke host container DB.
  - `PRISMA_CLIENT_ENGINE_TYPE=library` untuk engine prisma yang stabil di Node 22. Lihat [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L15).
  - Token ngrok di-compose disiapkan sebagai env; jaga kerahasiaan di lingkungan produksi.
- **Startup Orchestration**:
  - API menunggu database siap (`waitForDb`), memperbaiki kode gudang (`ensureWarehouseCodes`), menyiapkan seed gudang/prod/admin (`ensurePlaygroundSeed`, `ensureAdminSeed`), lalu menjalankan server dengan landing page GraphQL interaktif berisi document contoh. Lihat [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L38-L49, file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L51-L59, file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L84-L128, file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L130-L151, file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L158-L211).

### 9.4 End-to-End Data Lifecycle (Contoh Nyata)
- **Create Product + Initial Stock**:
  - Web kirim mutasi createProduct (dengan initialStock & gudang utama) → server membuat product, upsert stok di gudang utama, mencatat INITIAL_ADJUSTMENT → produk tampil di daftar, stok utama bertambah, riwayat transaksi ter-update.
- **Inbound (Restock Staff dari Main)**:
  - Mobile pilih produk dari Gudang Utama (tersedia) → kirim inboundStock → server kurangi stok Main, tambah stok Staff, catat TRANSFER → Stok Main turun, stok cabang naik, riwayat terisi.
- **Outbound (Keluar dari Cabang)**:
  - Mobile kirim outboundStock → server kurangi stok cabang, jika nol dan Main nol maka hapus rekaman → transaksi OUTBOUND tercatat → dashboard grafik outbound naik sesuai hari.
- **Transfer (Mutasi Antar Gudang)**:
  - Mobile scan produk dan pilih gudang tujuan → kirim transferStock → server kurangi stok sumber, upsert stok tujuan, bersihkan stok sumber bila nol dan Main nol → transaksi TRANSFER tercatat lengkap source/target.

### 9.5 Praktik Baik & Ekstensi
- **Konsistensi & Integritas**:
  - Gunakan transaksi Prisma untuk semua perubahan stok.
  - Manfaatkan composite unique pada StockItem untuk upsert yang aman.
- **Performa & Observabilitas**:
  - Tambahkan index pada kolom yang sering difilter (sku, warehouseId, productId) bila beban meningkat.
  - Pertimbangkan pagination server-side untuk produk/transactions (limit/offset atau cursor) saat dataset besar.
- **Keamanan**:
  - Ganti header `x-user-id` dengan JWT bearer token di production; validasi token dan role (ADMIN/STAFF) di context.
  - Jangan menaruh nilai token rahasia (ngrok/authtoken) di repo; gunakan secrets/ENV di CI/CD.

## 10. Kontribusi & Kompetensi

### 10.1 Kontribusi Tim (Signifikan)
- **Menyelesaikan Modul Utama**:
  - Web Dashboard interaktif berbasis Recharts (Bar/Pie/Area) dengan data GraphQL. Lihat [Dashboard.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Dashboard.jsx).
  - Halaman Produk: pagination 10 item per halaman, pencarian responsif. Lihat [Products.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Products.jsx).
  - Mobile App: aktivasi wajib, alur Inbound/Outbound/Transfer dengan validasi stok dan dialog interaktif. Lihat [dashboard_screen.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/screens/dashboard_screen.dart).
  - Backend: resolvers transaksi (inbound/outbound/transfer) atomik dan kebijakan pembersihan stok 0. Lihat [transaction.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts).
- **Key Member End-to-End**:
  - Merancang arsitektur GraphQL–Prisma–Postgres, menjalankan orkestrasi Docker Compose, serta menyelaraskan klien Web/Mobile.
  - Menjaga konsistensi tema UI (Slate/Cyan, Roboto Flex) agar pengalaman lintas platform seragam.
- **Memahami Keseluruhan Alur Kerja**:
  - Dari login/token di client, context di server, operasi bisnis stok, hingga visualisasi di dashboard dan riwayat transaksi. Bukti implementasi di [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts), [product.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/product.ts), [transaction.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts).

### 10.2 Pemahaman Teknis (GraphQL, Docker, API)
- **GraphQL**:
  - Menjelaskan desain schema-first: Query/Mutation + type domain, scalar Date, penggabungan typeDefs. Lihat [typeDefs/index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/index.ts), [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L31-L36).
  - Memaparkan resolvers: pemisahan per domain (produk/transaksi/user), computed fields (totalStock/isLowStock), relasi stocks. Lihat [product.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/product.ts), [transaction.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts).
- **API (Apollo Server)**:
  - Setup server, landing page plugin, introspection, context (prisma + userId), serta default document demo untuk uji cepat. Lihat [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L200-L220).
- **Prisma**:
  - Menjelaskan model & relasi (StockItem unique composite, Transaction dengan dua relasi Warehouse), transaksi atomik untuk operasi stok, upsert untuk memastikan rekam stok ada. Lihat [schema.prisma](file:///d:/projekan/nexus-inventory-system/backend/prisma/schema.prisma).
- **Docker**:
  - Menjelaskan layanan api/db/ngrok, healthcheck readiness untuk Postgres, environment penting (DATABASE_URL, PRISMA_CLIENT_ENGINE_TYPE), command bootstrap prisma. Lihat [docker-compose.yml](file:///d:/projekan/nexus-inventory-system/docker-compose.yml).

### 10.3 Pemahaman Pengetahuan (Dasar Teori)
- **ACID & Konsistensi Data**:
  - Operasi stok menggunakan `prisma.$transaction` untuk Atomicity/Consistency. Menghindari race-condition saat concurrent update stok.
- **Normalisasi & Presisi**:
  - Harga disimpan sebagai integer (priceCents) untuk menghindari error floating; contoh konversi di `updateProduct`. Lihat [product.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/product.ts#L103-L115).
- **Desain Relasi**:
  - Composite unique `productId_warehouseId` memastikan satu record stok per gudang per produk (integritas relasi).
- **GraphQL Teoretis**:
  - Strongly-typed schema membantu mencegah over/under-fetching; resolvers sebagai lapisan abstraksi antara skema dan storage, memudahkan evolusi skema tanpa mengubah storage.
- **Idempotensi & Kebersihan Data**:
  - Pola upsert pada stok tujuan (transfer/inbound) mendukung idempotensi; kebijakan penghapusan stok 0 menjaga dataset lean.
- **Containerization (Docker)**:
  - Isolasi layanan, reproducibility lingkungan, healthcheck sebagai mekanisme readiness; volume untuk persistensi data Postgres; memudahkan kolaborasi tim lintas mesin.

## 11. Diagram Sequence per Operasi

### 11.1 Login (Web/Mobile)

```
Client (Web/Mobile)                Apollo Server (GraphQL)                 Storage Lokal
      |  mutation login(email,pwd)       |                                       |
      |--------------------------------->| validate user + generate token         |
      |<---------------------------------| token string                           |
      | save token (localStorage/SP)     |                                       |
      | attach Authorization header (*)  |                                       |
      | on next requests                 |                                       |
```

- Backend context membaca identitas dari header (dev: `x-user-id`). Lihat [index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/index.ts#L214-L220).
- Mutasi login: [typeDefs/index.ts](file:///d:/projekan/nexus-inventory-system/backend/src/typeDefs/index.ts#L24-L39), implementasi [user.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/user.ts#L33).

### 11.2 Create Product + Initial Stock

```
Web (Products.jsx)              productResolvers (createProduct)                   DB (Prisma)
  | mutation createProduct  ---> create product row                               INSERT Product
  |                                if initialStock>0 & wId:                       UPSERT StockItem(productId,wId,+qty)
  |                                record INITIAL_ADJUSTMENT                      INSERT Transaction(type=INITIAL_ADJUSTMENT)
  | <-------------------------- hasil product                                      (return product)
```

- Client kirim variabel: sku, name, category, price, initialStock, warehouseId. Lihat [Products.jsx](file:///d:/projekan/nexus-inventory-system/client/web/src/pages/Products.jsx#L149-L159).
- Server: [product.ts](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/product.ts#L64-L102).

### 11.3 Inbound (Ambil dari Gudang Utama → Gudang Staff)

```
Mobile (Dashboard)         transactionResolvers (inboundStock)         DB
  | pilih produk di Main       cek stok sumber cukup                 SELECT StockItem(Main)
  | mutation inboundStock  ---> decrement stok di Main               UPDATE StockItem(Main,-qty)
  |                            upsert stok di Gudang Staff           UPSERT StockItem(Staff,+qty)
  |                            catat TRANSFER                        INSERT Transaction(TRANSFER, source=Main, target=Staff)
  | <---------------------- sukses                                    (return transaksi)
```

- UI: [dashboard_screen.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/screens/dashboard_screen.dart#L90-L262).
- Server: [transaction.ts:inboundStock](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L137-L199).

### 11.4 Outbound (Keluar dari Gudang Staff)

```
Mobile (Dashboard)         transactionResolvers (outboundStock)        DB
  | mutation outboundStock ---> cek stok cukup                        SELECT StockItem(Staff)
  |                             decrement stok                        UPDATE StockItem(Staff,-qty)
  |                             jika Staff=0 & Main=0: delete         DELETE StockItem(Staff)
  |                             catat OUTBOUND                        INSERT Transaction(OUTBOUND, source=Staff)
  | <------------------------ sukses                                   (return transaksi)
```

- UI: [dashboard_screen.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/screens/dashboard_screen.dart#L264-L408).
- Server: [transaction.ts:outboundStock](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L199-L238).

### 11.5 Transfer (Mutasi Antar Gudang)

```
Mobile (Scanner)           transactionResolvers (transferStock)        DB
  | scan produk + pilih tujuan  cek stok sumber                       SELECT StockItem(Source)
  | mutation transferStock ----> decrement stok sumber                 UPDATE StockItem(Source,-qty)
  |                               jika Source=0 & Main=0: delete      DELETE StockItem(Source)
  |                               upsert stok tujuan                  UPSERT StockItem(Target,+qty)
  |                               catat TRANSFER                      INSERT Transaction(TRANSFER, source=Source, target=Target)
  | <------------------------ sukses                                   (return transaksi)
```

- UI: [dashboard_screen.dart](file:///d:/projekan/nexus-inventory-system/client/mobile/mobile/lib/screens/dashboard_screen.dart#L410-L480).
- Server: [transaction.ts:transferStock](file:///d:/projekan/nexus-inventory-system/backend/src/resolvers/transaction.ts#L238-L305).

## 12. ERD Sederhana (Prisma)

```
+-------------+        +--------------+        +-----------------+
|  Product    |1     * |  StockItem   | *   1  |   Warehouse     |
| id (PK)     |--------| productId FK |--------| id (PK)         |
| sku (UQ)    |        | warehouseId FK        | code (UQ)       |
| name        |        | quantity              | name, location  |
| priceCents  |        +--------------+        +-----------------+
      | 1                                    1 |
      |                                        |
      | *                                      | *
+-----------------+                        +-----------------+
|  Transaction    |                        |  User           |
| id (PK)         |                        | id (PK)         |
| type            |                        | email (UQ)      |
| productId (FK)  |                        | name, role      |
| sourceWarehouseId (FK, nullable)         +-----------------+
| targetWarehouseId (FK, nullable)                |
| quantity, timestamp, referenceNote               | *
+-----------------+                                v
                                             +------------------+
                                             | UserWarehouse    |
                                             | id (PK)          |
                                             | userId, warehouseId (UQ pair)
                                             +------------------+
```

- Skema lengkap: [schema.prisma](file:///d:/projekan/nexus-inventory-system/backend/prisma/schema.prisma#L21-L89).
- Composite unique pada StockItem mencegah duplikasi stok per (product, warehouse).

## 13. Risiko & Mitigasi Produksi

- **Race Condition saat update stok**:
  - Mitigasi: gunakan `prisma.$transaction` untuk setiap operasi inbound/outbound/transfer; pertimbangkan lock di level baris bila beban tinggi.
- **Ghost Records (stok 0 tersisa)**:
  - Mitigasi: kebijakan penghapusan stok cabang saat quantity=0 dan stok Main=0 (diterapkan di outbound/transfer resolver).
- **Precision Harga**:
  - Mitigasi: simpan sebagai `priceCents` (integer), konversi di layer API/Client.
- **Overfetching GraphQL**:
  - Mitigasi: desain schema kuat, query spesifik (mis. transactions(limit)), dan gunakan pagination server-side jika data besar.
- **Keamanan Token**:
  - Mitigasi: di production gunakan JWT bearer token (bukan `x-user-id`), validasi role (ADMIN/STAFF) di context, aktifkan CSRF prevention bila perlu.
- **Konfigurasi Docker & Secrets**:
  - Mitigasi: jangan commit token sensitif (mis. ngrok authtoken) ke repo; gunakan ENV/secret manager, healthcheck DB, volume untuk persistensi.
