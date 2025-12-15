# Nexus Inventory System — Overview & Quick Start

## Ringkas
- Arsitektur: Backend GraphQL (Node.js + Prisma + PostgreSQL) dengan dua klien terpisah.
- Klien:
  - Admin Web: `client/web/index.html` dan `client/web/app.js`
  - Mobile (Flutter Placeholder): `client/mobile/index.html`
- Autentikasi:
  - Login mengembalikan token `user.id`, dikirim via header `x-user-id`.
  - Admin seed: email `admin@contoh.com`, password `admin1234` (dapat diubah via env `ADMIN_PASSWORD`).
  - Token disimpan di `sessionStorage` per tab dan dihapus saat `unload`.
- QR:
  - Cetak langsung di halaman sebagai JPG; tombol download JPG dengan nama file mengikuti produk/gudang.

## Menjalankan
- Dengan Docker:
  - `docker compose up -d`
  - API GraphQL tersedia di `http://localhost:4000/`
  - Base image backend: `node:22-bookworm-slim` untuk stabilitas Prisma Node-API.
- Tanpa Docker (opsional):
  - Pastikan PostgreSQL berjalan dan `DATABASE_URL` terpasang.
  - Jalankan `npm install`, `npx prisma generate`, `npx prisma db push`, lalu `npm start` di folder `backend`.

## Struktur
- Backend: `backend/` (Apollo Server, Prisma, resolvers)
- Klien Admin: `client/web/`
- Klien Mobile (placeholder Flutter): `client/mobile/`
- Status & dokumen: `status aplikasi.md`

# Contoh Mutation Query Apollo GraphQL

Dokumen ini menyediakan contoh mutation query untuk setiap model dalam sistem inventaris, termasuk operasi `create`, `update`, dan `delete`. Setiap contoh `create` dilengkapi dengan 5 baris data untuk demonstrasi.

## Daftar Isi
1.  [Product Mutations](#1-product-mutations)
    *   [Create Product](#create-product)
    *   [Update Product](#update-product)
    *   [Delete Product](#delete-product)
2.  [Warehouse Mutations](#2-warehouse-mutations)
    *   [Create Warehouse](#create-warehouse)
    *   [Update Warehouse](#update-warehouse)
    *   [Delete Warehouse](#delete-warehouse)
3.  [StockItem Mutations](#3-stockitem-mutations)
    *   [Create StockItem](#create-stockitem)
    *   [Update StockItem](#update-stockitem)
    *   [Delete StockItem](#delete-stockitem)
4.  [Transaction Mutations](#4-transaction-mutations)
    *   [Inbound Stock](#inbound-stock)
    *   [Outbound Stock](#outbound-stock)
    *   [Transfer Stock](#transfer-stock)

---

## 1. Product Mutations

### Create Product

```graphql
mutation CreateProducts {
  createProduct(
    sku: "SKU001"
    name: "Laptop Gaming"
    category: "Electronics"
    price: 150000
  ) {
    id
    name
    sku
  }
  createProduct2: createProduct(
    sku: "SKU002"
    name: "Mouse Wireless"
    category: "Electronics"
    price: 2500
  ) {
    id
    name
    sku
  }
  createProduct3: createProduct(
    sku: "SKU003"
    name: "Keyboard Mekanik"
    category: "Electronics"
    price: 7500
  ) {
    id
    name
    sku
  }
  createProduct4: createProduct(
    sku: "SKU004"
    name: "Monitor Ultrawide"
    category: "Electronics"
    price: 300000
  ) {
    id
    name
    sku
  }
  createProduct5: createProduct(
    sku: "SKU005"
    name: "Webcam Full HD"
    category: "Electronics"
    price: 12000
  ) {
    id
    name
    sku
  }
}
```

### Update Product

```graphql
mutation UpdateProduct {
  updateProduct(
    id: "PRODUCT_ID_TO_UPDATE"
    name: "Laptop Gaming Pro"
    price: 160000
  ) {
    id
    name
    price
  }
}
```

### Delete Product

```graphql
mutation DeleteProduct {
  deleteProduct(id: "PRODUCT_ID_TO_DELETE") {
    id
    name
  }
}
```

---

## 2. Warehouse Mutations

### Create Warehouse

```graphql
mutation CreateWarehouses {
  createWarehouse(
    name: "Gudang Pusat Jakarta"
    location: "Jakarta Pusat"
    capacity: 10000
  ) {
    id
    name
    location
  }
  createWarehouse2: createWarehouse(
    name: "Gudang Cabang Surabaya"
    location: "Surabaya"
    capacity: 5000
  ) {
    id
    name
    location
  }
  createWarehouse3: createWarehouse(
    name: "Gudang Logistik Bandung"
    location: "Bandung"
    capacity: 7500
  ) {
    id
    name
    location
  }
  createWarehouse4: createWarehouse(
    name: "Gudang Transit Medan"
    location: "Medan"
    capacity: 2000
  ) {
    id
    name
    location
  }
  createWarehouse5: createWarehouse(
    name: "Gudang Utama Semarang"
    location: "Semarang"
    capacity: 6000
  ) {
    id
    name
    location
  }
}
```

### Update Warehouse

```graphql
mutation UpdateWarehouse {
  updateWarehouse(id: "WAREHOUSE_ID_TO_UPDATE",
    name: "Gudang Pusat Jakarta Baru"
    capacity: 12000
  ) {
    id
    name
    capacity
  }
}
```

### Delete Warehouse

```graphql
mutation DeleteWarehouse {
  deleteWarehouse(id: "WAREHOUSE_ID_TO_DELETE") {
    id
    name
  }
}
```

---

## 3. StockItem Mutations

### Create StockItem

Catatan: `productId` dan `warehouseId` harus berupa ID yang sudah ada dari `Product` dan `Warehouse` yang telah dibuat.

```graphql
mutation CreateStockItems {
  createStockItem(
    productId: "PRODUCT_ID_1"
    warehouseId: "WAREHOUSE_ID_1"
    quantity: 50
  ) {
    id
    product { name }
    warehouse { name }
    quantity
  }
  createStockItem2: createStockItem(
    productId: "PRODUCT_ID_2"
    warehouseId: "WAREHOUSE_ID_1"
    quantity: 100
  ) {
    id
    product { name }
    warehouse { name }
    quantity
  }
  createStockItem3: createStockItem(
    productId: "PRODUCT_ID_1"
    warehouseId: "WAREHOUSE_ID_2"
    quantity: 20
  ) {
    id
    product { name }
    warehouse { name }
    quantity
  }
  createStockItem4: createStockItem(
    productId: "PRODUCT_ID_3"
    warehouseId: "WAREHOUSE_ID_2"
    quantity: 75
  ) {
    id
    product { name }
    warehouse { name }
    quantity
  }
  createStockItem5: createStockItem(
    productId: "PRODUCT_ID_4"
    warehouseId: "WAREHOUSE_ID_3"
    quantity: 10
  ) {
    id
    product { name }
    warehouse { name }
    quantity
  }
}
```

### Update StockItem

Catatan: `id` adalah ID dari `StockItem` yang ingin diperbarui.

```graphql
mutation UpdateStockItem {
  updateStockItem(id: "STOCK_ITEM_ID_TO_UPDATE",
    quantity: 60
  ) {
    id
    quantity
  }
}
```

### Delete StockItem

Catatan: `id` adalah ID dari `StockItem` yang ingin dihapus.

```graphql
mutation DeleteStockItem {
  deleteStockItem(id: "STOCK_ITEM_ID_TO_DELETE") {
    id
    product { name }
    warehouse { name }
  }
}
```

---

## 4. Transaction Mutations

### Inbound Stock

Catatan: `productId` dan `warehouseId` harus berupa ID yang sudah ada.

```graphql
mutation InboundStocks {
  inboundStock(
    productId: "PRODUCT_ID_1"
    warehouseId: "WAREHOUSE_ID_1"
    quantity: 10
    note: "Penerimaan barang baru dari supplier A"
  ) {
    id
    type
    product { name }
    targetWarehouse { name }
    quantity
  }
  inboundStock2: inboundStock(
    productId: "PRODUCT_ID_2"
    warehouseId: "WAREHOUSE_ID_1"
    quantity: 5
    note: "Restock produk SKU002"
  ) {
    id
    type
    product { name }
    targetWarehouse { name }
    quantity
  }
  inboundStock3: inboundStock(
    productId: "PRODUCT_ID_3"
    warehouseId: "WAREHOUSE_ID_2"
    quantity: 15
    note: "Penerimaan dari retur pelanggan"
  ) {
    id
    type
    product { name }
    targetWarehouse { name }
    quantity
  }
  inboundStock4: inboundStock(
    productId: "PRODUCT_ID_4"
    warehouseId: "WAREHOUSE_ID_3"
    quantity: 2
    note: "Tambahan stok untuk event"
  ) {
    id
    type
    product { name }
    targetWarehouse { name }
    quantity
  }
  inboundStock5: inboundStock(
    productId: "PRODUCT_ID_5"
    warehouseId: "WAREHOUSE_ID_1"
    quantity: 8
    note: "Penerimaan produk baru SKU005"
  ) {
    id
    type
    product { name }
    targetWarehouse { name }
    quantity
  }
}
```

### Outbound Stock

Catatan: `productId` dan `warehouseId` harus berupa ID yang sudah ada.

```graphql
mutation OutboundStocks {
  outboundStock(
    productId: "PRODUCT_ID_1"
    warehouseId: "WAREHOUSE_ID_1"
    quantity: 3
    note: "Pengiriman pesanan pelanggan #123"
  ) {
    id
    type
    product { name }
    sourceWarehouse { name }
    quantity
  }
  outboundStock2: outboundStock(
    productId: "PRODUCT_ID_2"
    warehouseId: "WAREHOUSE_ID_1"
    quantity: 1
    note: "Pengiriman pesanan pelanggan #124"
  ) {
    id
    type
    product { name }
    sourceWarehouse { name }
    quantity
  }
  outboundStock3: outboundStock(
    productId: "PRODUCT_ID_3"
    warehouseId: "WAREHOUSE_ID_2"
    quantity: 5
    note: "Pengiriman ke toko retail X"
  ) {
    id
    type
    product { name }
    sourceWarehouse { name }
    quantity
  }
  outboundStock4: outboundStock(
    productId: "PRODUCT_ID_4"
    warehouseId: "WAREHOUSE_ID_3"
    quantity: 1
    note: "Pengiriman sampel produk"
  ) {
    id
    type
    product { name }
    sourceWarehouse { name }
    quantity
  }
  outboundStock5: outboundStock(
    productId: "PRODUCT_ID_5"
    warehouseId: "WAREHOUSE_ID_1"
    quantity: 2
    note: "Pengiriman pesanan pelanggan #125"
  ) {
    id
    type
    product { name }
    sourceWarehouse { name }
    quantity
  }
}
```

### Transfer Stock

Catatan: `productId`, `sourceWarehouseId`, dan `targetWarehouseId` harus berupa ID yang sudah ada.

```graphql
mutation TransferStocks {
  transferStock(
    productId: "PRODUCT_ID_1"
    fromWarehouseId: "WAREHOUSE_ID_1"
    toWarehouseId: "WAREHOUSE_ID_2"
    quantity: 5
    note: "Transfer stok antar gudang"
  ) {
    id
    type
    product { name }
    sourceWarehouse { name }
    targetWarehouse { name }
    quantity
  }
  transferStock2: transferStock(
    productId: "PRODUCT_ID_2"
    fromWarehouseId: "WAREHOUSE_ID_1"
    toWarehouseId: "WAREHOUSE_ID_3"
    quantity: 2
    note: "Transfer untuk kebutuhan regional"
  ) {
    id
    type
    product { name }
    sourceWarehouse { name }
    targetWarehouse { name }
    quantity
  }
  transferStock3: transferStock(
    productId: "PRODUCT_ID_3"
    fromWarehouseId: "WAREHOUSE_ID_2"
    toWarehouseId: "WAREHOUSE_ID_1"
    quantity: 10
    note: "Pengembalian stok ke gudang pusat"
  ) {
    id
    type
    product { name }
    sourceWarehouse { name }
    targetWarehouse { name }
    quantity
  }
  transferStock4: transferStock(
    productId: "PRODUCT_ID_4"
    fromWarehouseId: "WAREHOUSE_ID_3"
    toWarehouseId: "WAREHOUSE_ID_2"
    quantity: 1
    note: "Transfer stok darurat"
  ) {
    id
    type
    product { name }
    sourceWarehouse { name }
    targetWarehouse { name }
    quantity
  }
  transferStock5: transferStock(
    productId: "PRODUCT_ID_5"
    fromWarehouseId: "WAREHOUSE_ID_1"
    toWarehouseId: "WAREHOUSE_ID_3"
    quantity: 3
    note: "Transfer stok untuk promosi"
  ) {
    id
    type
    product { name }
    sourceWarehouse { name }
    targetWarehouse { name }
    quantity
  }
}
```

---

## 5. Mengakses Database di Docker

Jika Anda menggunakan Docker Desktop dan ingin memeriksa data langsung di database PostgreSQL yang berjalan di dalam kontainer, Anda bisa menggunakan perintah `docker exec`.

### 1. Temukan Nama atau ID Kontainer Database

Pertama, Anda perlu mengetahui nama atau ID kontainer database PostgreSQL Anda. Anda bisa melihatnya dengan perintah berikut:

```bash
docker ps
```

Cari kontainer yang menjalankan PostgreSQL (biasanya memiliki nama seperti `postgres` atau `db`). Catat `CONTAINER ID` atau `NAMES` dari kontainer tersebut.

### 2. Akses Shell di Dalam Kontainer Database

Gunakan perintah `docker exec` untuk masuk ke dalam shell kontainer database. Ganti `<CONTAINER_ID_OR_NAME>` dengan ID atau nama kontainer yang Anda temukan.

```bash
docker exec -it <CONTAINER_ID_OR_NAME> bash
```

### 3. Akses PostgreSQL Client (psql)

Setelah berada di dalam shell kontainer, Anda bisa mengakses klien `psql` untuk berinteraksi dengan database. Ganti `<DATABASE_NAME>` dengan nama database Anda (misalnya `nexus_inventory`).

```bash
psql -U postgres -d <DATABASE_NAME>
```

Jika Anda tidak yakin dengan nama database, Anda bisa mencoba `psql -U postgres` dan kemudian menggunakan `\l` untuk melihat daftar database.

### 4. Perintah SQL untuk Melihat Tabel dan Data

Setelah masuk ke `psql`, Anda bisa menggunakan perintah SQL berikut:

*   **Melihat semua tabel:**
    ```sql
    \dt
    ```

*   **Melihat isi data dari sebuah tabel:**
    Ganti `<TABLE_NAME>` dengan nama tabel yang ingin Anda lihat (misalnya `Product`, `Warehouse`, `StockItem`, `Transaction`).
    **Penting:** Pastikan setiap perintah SQL diakhiri dengan titik koma (`;`).
    ```sql
    SELECT * FROM "<TABLE_NAME>";
    ```
    Contoh:
    ```sql
    SELECT * FROM "Product";
    SELECT * FROM "Warehouse";
    SELECT * FROM "StockItem";
    SELECT * FROM "Transaction";
    ```

*   **Keluar dari psql:**
    ```sql
    \q
    ```

*   **Keluar dari shell kontainer:**
    ```bash
    exit
    ```

---

## 6. Panduan Seeding Data dan Pengujian Mutasi Menggunakan Apollo Sandbox

Ini adalah panduan langkah demi langkah untuk melakukan seeding data awal dan menguji mutasi utama menggunakan Apollo Sandbox, yang sangat penting untuk memverifikasi fungsionalitas backend Anda.

### 1. Cara Mengakses Tool (Apollo Sandbox)

Saat Anda menjalankan `npm start`, terminal akan menampilkan: `🚀 Server ready at http://localhost:4000/`
Buka link tersebut di browser (Chrome/Edge). Anda akan melihat tampilan antarmuka grafis. Itulah Apollo Sandbox. Anda tidak perlu menginstal Postman terpisah jika tidak mau.

### 2. Skenario "Seeding Data" (Wajib Dilakukan)

Agar fitur utama `transferStock` bisa dites, Anda harus punya data dulu. Logikanya: "Bagaimana mau transfer barang kalau Gudangnya belum ada dan Barangnya belum dibuat?"

Silakan copy-paste Mutation berikut ke Apollo Sandbox Anda secara berurutan:

#### Langkah A: Buat 2 Gudang

Kita butuh minimal 2 gudang untuk tes transfer.

**Mutation 1 (Gudang Asal):**
```graphql
mutation {
  createWarehouse(
    name: "Gudang Jakarta Pusat"
    location: "Tanah Abang, Jakarta"
    capacity: 1000
  ) {
    id
    name
  }
}
```
(Catat `id` yang muncul di respon, misal: `wh-jkt-01`)

**Mutation 2 (Gudang Tujuan):**
```graphql
mutation {
  createWarehouse(
    name: "Gudang Surabaya"
    location: "Rungkut, Surabaya"
    capacity: 500
  ) {
    id
    name
  }
}
```
(Catat `id` yang muncul, misal: `wh-sby-01`)

#### Langkah B: Buat Produk

Buat satu barang untuk dites.

```graphql
mutation {
  createProduct(
    sku: "LAPTOP-001"
    name: "MacBook Pro M3"
    category: "Electronics"
    price: 25000000 # Menggunakan price
  ) {
    id
    name
    totalStock # Harusnya masih 0
  }
}
```
(Catat `id` produk, misal: `prod-mac-01`)

#### Langkah C: Isi Stok Awal (Inbound)

Gudang tidak boleh kosong saat mau transfer. Kita harus pura-pura ada barang masuk dari supplier.

```graphql
mutation {
  inboundStock(
    warehouseId: "MASUKAN_ID_GUDANG_JAKARTA_DISINI" # Ganti dengan ID Gudang Jakarta
    productId: "MASUKAN_ID_PRODUK_DISINI" # Ganti dengan ID Produk
    quantity: 50
    note: "Stok Awal dari Apple Inc."
  ) {
    id
    quantity
    targetWarehouse { name }
    product { totalStock } # Harusnya jadi 50
  }
}
```

#### Langkah D: Uji Coba Transfer (Fitur Utama Week 2)

Ini adalah pembuktian bahwa logic `transaction.ts` Anda jalan.

```graphql
mutation {
  transferStock(
    fromWarehouseId: "MASUKAN_ID_GUDANG_JAKARTA_DISINI" # Ganti dengan ID Gudang Jakarta
    toWarehouseId: "MASUKAN_ID_GUDANG_SURABAYA_DISINI" # Ganti dengan ID Gudang Surabaya
    productId: "MASUKAN_ID_PRODUK_DISINI" # Ganti dengan ID Produk
    quantity: 10
    note: "Mutasi ke Cabang Surabaya"
  ) {
    id
    type
    sourceWarehouse { name }
    targetWarehouse { name }
  }
}
```
