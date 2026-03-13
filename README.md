# Nexus Inventory System

Sistem manajemen inventaris *hybrid* Enterprise-grade yang dirancang dengan pendekatan **Modular Monolith** untuk fleksibilitas, skalabilitas, dan konsistensi data tinggi. Solusi ini menghubungkan Web Admin Pusat dengan Aplikasi Mobile Operasional Gudang secara seamless.

---

## 🛠️ Panduan Instalasi (Installation Guide)

Ikuti langkah-langkah di bawah ini secara berurutan untuk menjalankan sistem di lingkungan lokal Anda.

### Prasyarat (Prerequisites)
Pastikan perangkat Anda sudah terinstal:
- **Node.js** (v18 atau lebih baru)
- **PostgreSQL** (v14 atau lebih baru)
- **Flutter SDK** (Terbaru, untuk Mobile App)
- **Git**

---

### 1. Backend Setup (Server & Database)

Ini adalah jantung sistem. Jalankan ini terlebih dahulu.

**Langkah 1: Clone & Install Dependencies**
```bash
git clone <repository_url>
cd nexus-inventory-system/backend
npm install
```

**Langkah 2: Konfigurasi Environment**
Buat file `.env` di folder `backend` dan isi dengan konfigurasi database Anda:
```env
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://postgres:password@localhost:5432/nexus_db?schema=public"
```

**Langkah 3: Migrasi Database**
Sinkronkan skema Prisma dengan database lokal Anda:
```bash
npx prisma migrate dev --name init
```

**Langkah 4: Jalankan Server**
```bash
# Mode Development (Auto-restart saat ada perubahan kode)
npm run dev

# Server akan berjalan di: http://localhost:4000
```

---

### 2. Frontend Web Setup (Admin Dashboard)

Dashboard untuk admin memantau stok dan manajemen user.

**Langkah 1: Install Dependencies**
Buka terminal baru, masuk ke folder web:
```bash
cd nexus-inventory-system/client/web
npm install
```

**Langkah 2: Konfigurasi Koneksi**
Pastikan `lib/apollo.js` mengarah ke URL backend yang benar (Default: `http://localhost:4000`).

**Langkah 3: Jalankan Web App**
```bash
npm run dev
```
Akses Dashboard di browser: `http://localhost:5173`

---

### 3. Mobile App Setup (Operational Staff)

Aplikasi untuk staf gudang melakukan scan dan input barang.

**Langkah 1: Persiapan Flutter**
Buka terminal baru, masuk ke folder mobile:
```bash
cd nexus-inventory-system/client/mobile/mobile
flutter pub get
```

**Langkah 2: Konfigurasi API**
- Untuk **Android Emulator**: Gunakan `http://10.0.2.2:4000/` (Loopback ke localhost PC).
- Untuk **Device Fisik**: Gunakan IP LAN PC Anda (misal: `http://192.168.1.10:4000/`) atau Ngrok.
- Edit file `lib/config/graphql.dart` jika perlu.

**Langkah 3: Jalankan Aplikasi**
```bash
# Pastikan emulator sudah jalan atau HP tercolok
flutter run
```

---

## 🧪 Testing Manual (Apollo Sandbox)

Anda bisa menguji API tanpa Frontend menggunakan **Apollo Sandbox**.
1. Buka browser: `http://localhost:4000`
2. Klik tombol "Query your server".
3. Gunakan *Cheat Sheet* di bawah ini untuk mencoba operasi dasar.

### Apollo Sandbox Cheat Sheet

Salin query/mutation berikut ke tab **Operation** di Apollo Sandbox.

#### A. Setup Header (PENTING!)
Agar server tahu siapa yang melakukan request, Anda harus menyisipkan **User ID** di HTTP Header.
1. Klik tab **Headers** (di panel bawah Sandbox).
2. Tambahkan key-value berikut:
   ```json
   {
     "x-user-id": "paste_user_id_disini"
   }
   ```
   *(Tips: Lakukan Query `Login` atau `Get Users` dulu untuk mendapatkan ID User)*

#### B. Kumpulan Query & Mutation

**1. Authentication (Dapatkan User ID)**
```graphql
# Login Admin (Default Seed)
# Gunakan ID yang muncul untuk Header 'x-user-id'
mutation Login {
  login(email: "admin@contoh.com", password: "admin1234")
}

# Atau ambil semua user untuk melihat ID Staff
query GetAllUsers {
  users {
    id
    name
    role
    email
  }
}
```

**2. Product Management (Master Data)**
```graphql
# Lihat Semua Produk
query GetProducts {
  products {
    id
    sku
    name
    totalStock
    stocks {
      warehouse { name }
      quantity
    }
  }
}

# Tambah Produk Baru
mutation CreateNewProduct {
  createProduct(
    sku: "KOPI-001"
    name: "Kopi Arabika 100g"
    category: "Minuman"
    price: 15000
    initialStock: 100
    warehouseId: "wh_id_disini" # Ambil ID dari query warehouses
  ) {
    id
    name
    totalStock
  }
}
```

**3. Warehouse Operations**
```graphql
# Cek Daftar Gudang
query GetWarehouses {
  warehouses {
    id
    name
    code
  }
}
```

**4. Stock Transactions (Operasional)**
```graphql
# Barang Masuk (Inbound)
mutation Inbound {
  inboundStock(
    warehouseId: "wh_id_disini"
    productId: "prod_id_disini"
    quantity: 50
    note: "Restock Mingguan"
  ) {
    id
    type
    quantity
    product { name }
    targetWarehouse { name }
  }
}

# Pindah Stok (Transfer)
mutation Transfer {
  transferStock(
    fromWarehouseId: "wh_asal_id"
    toWarehouseId: "wh_tujuan_id"
    productId: "prod_id_disini"
    quantity: 20
    note: "Distribusi ke Cabang"
  ) {
    id
    type
    quantity
    sourceWarehouse { name }
    targetWarehouse { name }
  }
}
```

---

## 🏛️ Arsitektur & Desain Sistem

Sistem ini dibangun di atas arsitektur **Client-Server** modern yang memanfaatkan **GraphQL** sebagai layer komunikasi data yang efisien dan *type-safe*.

### 📊 Diagram Arsitektur (High-Level)

```mermaid
graph TD
    subgraph Client_Side [Client Layer]
        Web[💻 Web Admin Dashboard]
        Mob[📱 Mobile App Staff]
    end

    subgraph API_Gateway [API Layer]
        GQL[🚀 GraphQL Server / Apollo]
    end

    subgraph Core_Services [Backend Services]
        Auth[🔐 Auth Service]
        Inv[📦 Inventory Service]
        Tx[💸 Transaction Service]
        Master[🗃️ Master Data Service]
    end

    subgraph Data_Layer [Persistence Layer]
        Prisma[💎 Prisma ORM]
        DB[(🛢️ PostgreSQL Database)]
    end

    Web <-->|Query/Mutation| GQL
    Mob <-->|Query/Mutation| GQL
    GQL --> Auth
    GQL --> Inv
    GQL --> Tx
    GQL --> Master
    
    Auth --> Prisma
    Inv --> Prisma
    Tx --> Prisma
    Master --> Prisma
    
    Prisma <--> DB
```

### 🧩 Prinsip Desain Modular

Sistem dirancang agar setiap komponen memiliki tanggung jawab tunggal (*Single Responsibility*) namun tetap terintegrasi dalam satu ekosistem:

1.  **Backend (The Core)**:
    -   **Modular Resolvers**: Resolver GraphQL dipisah berdasarkan domain (Product, Warehouse, Transaction).
    -   **Prisma ORM**: Abstraksi database yang kuat untuk menjamin integritas relasi data.
    -   **Service Layer**: Logika bisnis dipisahkan dari resolver untuk kemudahan testing dan maintenance.

2.  **Web Admin (The Command Center)**:
    -   **Component-Based**: Menggunakan React Components yang reusable (Button, Card, Chart).
    -   **Hooks Pattern**: Logika state management (data fetching, caching) dibungkus dalam Custom Hooks.
    -   **Atomic Design**: Struktur UI dari atom (icon) hingga pages (Dashboard).

3.  **Mobile App (The Operational Arm)**:
    -   **Provider Pattern**: Manajemen state global untuk autentikasi dan data sesi.
    -   **Widget Composition**: UI Flutter yang disusun dari widget-widget kecil yang modular.

---

## 🔄 Alur Data Konsisten (Data Flow)

Sistem menggunakan **GraphQL** untuk menjamin konsistensi data antara Server, Web, dan Mobile.

### 1. Pola Komunikasi (Request-Response Cycle)
Semua komunikasi data mengikuti pola standar yang ketat untuk mencegah *race condition* dan inkonsistensi data:

1.  **Client Request**:
    -   Web/Mobile mengirim operasi `Query` (baca) atau `Mutation` (tulis).
    -   Payload divalidasi tipe datanya secara otomatis oleh Schema GraphQL.

2.  **Server Processing**:
    -   **Authentication Middleware**: Memverifikasi User ID via header `x-user-id`.
    -   **Resolver Execution**: Menjalankan logika bisnis spesifik.
    -   **Database Transaction**: Menggunakan Prisma `$transaction` untuk operasi multi-tabel (misal: Barang Keluar -> Kurangi Stok -> Catat Log). Jika satu gagal, semua dibatalkan (*Atomicity*).

3.  **Response & Update**:
    -   Server mengembalikan data JSON terstruktur sesuai request client.
    -   **Apollo Client Cache** (di Web) otomatis memperbarui UI tanpa perlu reload halaman manual.

### 2. Skenario Kritis: Sinkronisasi Stok
```mermaid
sequenceDiagram
    participant S as Staff (Mobile)
    participant A as API (Server)
    participant D as Database
    participant W as Web Admin (Pusat)

    S->>A: Mutation: stockOut(qty: 5)
    activate A
    A->>A: Validate User & Stock
    A->>D: BEGIN TRANSACTION
    D->>D: Update StockItem (-5)
    D->>D: Insert TransactionLog
    D-->>A: COMMIT
    A-->>S: Return New Stock Data
    deactivate A
    
    Note over W: Admin refresh/polling
    W->>A: Query: getProducts
    A-->>W: Return Updated Stock
```
