# 🚀 Nexus API Testing Guide

Panduan lengkap untuk menjalankan dan menguji API Nexus Inventory System menggunakan **Apollo Sandbox**.

---

## 🏃‍♂️ 1. Menjalankan Server (Cara Running)

Anda memiliki dua opsi untuk menjalankan backend server:

### Opsi A: Menggunakan Docker (Disarankan) 🐳
Ini adalah cara paling mudah karena database & environment sudah otomatis disetup.

```bash
# Di folder root project (nexus-inventory-system)
docker compose up -d
```
*   Server siap di: `http://localhost:4000`

### Opsi B: Menggunakan NPM Manual 🛠️
Gunakan cara ini jika Anda sedang developing backend dan butuh log realtime di terminal.

1.  Pastikan Database PostgreSQL sudah jalan.
2.  Setup environment variable `.env` di folder `backend/`.
3.  Jalankan perintah:

```bash
cd backend
npm install
npx prisma generate
npx prisma db push  # Sinkronisasi schema database
npm run dev
```
*   Server siap di: `http://localhost:4000`

---

## 🧪 2. Mengakses Apollo Sandbox

Apollo Server memiliki fitur GUI bawaan untuk testing API (mirip Postman tapi khusus GraphQL).

1.  Buka Browser (Chrome/Edge).
2.  Kunjungi: **`http://localhost:4000`**
3.  Klik tombol **"Query your server"**.
4.  Anda akan masuk ke **Apollo Sandbox**.

---

## ⚡ 3. Kumpulan Query & Mutation (Cheat Sheet)

Salin kode di bawah ini ke panel **Operation** di Apollo Sandbox untuk mengetes fitur.

### 🔐 A. Authentication (Login)

Langkah pertama adalah mendapatkan `userId` untuk kebutuhan `me`. Pada backend ini, `login(...)` mengembalikan **userId** (bukan JWT).

```graphql
# 1. Login Admin
mutation LoginAdmin {
  login(email: "admin@contoh.com", password: "admin1234")
}

# 2. Login Staff (Seed)
mutation LoginStaff {
  login(email: "staff@contoh.com", password: "staff1234")
}
```

Masukkan hasil `login` ke **Headers** di Apollo Sandbox:

```json
{ "x-user-id": "PASTE_USER_ID_HERE" }
```

---

### 📦 B. Manajemen Produk (Master Data)

Fitur CRUD Produk lengkap dengan cek stok.

```graphql
# 1. Tambah Produk Baru
mutation CreateProduct {
  createProduct(
    sku: "SKU-KOPI-001"
    name: "Kopi Arabika 1kg"
    category: "F&B"
    price: 150000
    initialStock: 100
    warehouseId: "wh_utama_id_disini" # Ganti dengan ID Warehouse nyata
  ) {
    id
    name
    totalStock
  }
}

# 2. Lihat Semua Produk (Beserta Stok)
query GetAllProducts {
  products {
    id
    sku
    name
    category
    price
    totalStock     # Field computed (Global Stock)
    isLowStock     # Field computed (Boolean)
    stocks {
      warehouse {
        name
      }
      quantity
    }
  }
}

# 3. Update Produk
mutation EditProduct {
  updateProduct(
    id: "prod_id_disini"
    name: "Kopi Arabika Premium 1kg"
    price: 165000
  ) {
    id
    name
    price
  }
}

# 4. Hapus Produk
mutation DeleteProduct {
  deleteProduct(id: "prod_id_disini")
}
```

---

### 🏭 C. Manajemen Gudang (Warehouse)

```graphql
# 1. Buat Gudang Baru
mutation CreateWarehouse {
  createWarehouse(
    name: "Gudang Cabang Surabaya"
    location: "Jl. Pemuda No. 1"
    code: "WH-SBY"
    capacity: 5000
  ) {
    id
    name
  }
}

# 2. Lihat Daftar Gudang & Staffnya
query GetWarehouses {
  warehouses {
    id
    name
    code
    capacity
    staffs {
      name
      email
    }
    stocks {
      product {
        name
      }
      quantity
    }
  }
}
```

---

### 🚚 D. Transaksi Stok (Operasional)

Ini adalah fitur inti untuk mengubah jumlah stok.

```graphql
# 1. Inbound (Barang Masuk)
mutation Inbound {
  inboundStock(
    warehouseId: "wh_id_disini"
    productId: "prod_id_disini"
    quantity: 50
    note: "Restock dari Supplier A"
  ) {
    id
    type
    quantity
    timestamp
    product { name }
  }
}

# 2. Outbound (Barang Keluar / Penjualan)
mutation Outbound {
  outboundStock(
    warehouseId: "wh_id_disini"
    productId: "prod_id_disini"
    quantity: 5
    note: "Sales Order #INV-001"
  ) {
    id
    type
    quantity
  }
}

# 3. Transfer Antar Gudang
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

# 4. Lihat Riwayat Transaksi
query History {
  transactions(limit: 10) {
    id
    type
    quantity
    timestamp
    referenceNote
    product { name }
    sourceWarehouse { name }
    targetWarehouse { name }
  }
}
```

---

### 👥 E. Manajemen Staff (User Assignment)

Mengatur siapa menjaga gudang mana.

```graphql
# 0. Buat Staff Baru (Jika diperlukan)
mutation CreateStaff {
  createUser(email: "staff.baru@contoh.com", name: "Staff Baru", role: STAFF, password: "staff1234") {
    id
    email
    role
  }
}

# 1. Tugaskan Staff ke Gudang
mutation AssignStaff {
  assignStaffToWarehouse(
    userId: "user_staff_id"
    warehouseId: "wh_id_disini"
  )
}

# 2. Lepas Tugas Staff
mutation UnassignStaff {
  unassignStaffFromWarehouse(
    userId: "user_staff_id"
    warehouseId: "wh_id_disini"
  )
}

# 3. Cek Profil Sendiri
query Me {
  me {
    id
    name
    email
    role
    warehouses {
      name
    }
  }
}
```
