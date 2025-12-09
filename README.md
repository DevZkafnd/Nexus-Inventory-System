# Nexus Inventory System — Panduan Menjalankan Proyek

Dokumen ini menjelaskan cara menyiapkan lingkungan, menjalankan proyek dengan Docker dan secara lokal, serta alur kerja pengembangan. Diletakkan di root repo (`nexus-inventory-system/`).

## Ringkasan
- Backend ditulis dengan TypeScript (entry point: `backend/src/index.ts`).
- Skema GraphQL berada di `backend/src/typeDefs/*.graphql` dan `backend/src/typeDefs/index.ts`.
- `client/` saat ini kosong dan akan diisi kemudian.
- `docker-compose.yml` dan `backend/Dockerfile` tersedia, namun perlu diisi sesuai kebutuhan Anda.

## Prasyarat
- Windows + PowerShell.
- Docker Desktop (WSL2 disarankan). Unduh: https://www.docker.com/products/docker-desktop
- Node.js LTS (disarankan v18+). Unduh: https://nodejs.org/
- Package manager: `npm` atau `pnpm` (opsional).

## Struktur Proyek
```
nexus-inventory-system/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── index.ts
│       └── typeDefs/
│           ├── index.ts
│           ├── product.graphql
│           ├── warehouse.graphql
│           └── transaction.graphql
└── client/
```

## Menjalankan dengan Docker
Pada tahap ini, file `Dockerfile` dan `docker-compose.yml` masih kosong. Berikut contoh minimal yang direkomendasikan agar backend dapat berjalan.

### Contoh `backend/Dockerfile`
```
# Gunakan image Node.js ringan
FROM node:18-alpine

# Direktori kerja dalam container
WORKDIR /app

# Salin file manifest terlebih dahulu agar cache efisien
COPY package*.json ./

# Install dependencies (ganti dengan pnpm bila diperlukan)
RUN npm ci --only=production || npm install --production

# Salin source code
COPY src ./src

# Build TypeScript ke dist (pastikan ada tsconfig.json dan script build)
# Jika belum ada proses build, Anda bisa menggunakan ts-node di tahap awal.
# Berikut contoh menggunakan ts-node:
RUN npm install --no-save ts-node typescript

# Default port
ENV PORT=4000

# Jalankan server (sesuaikan dengan entry point Anda)
CMD ["npx", "ts-node", "src/index.ts"]
```

### Contoh `docker-compose.yml`
```
services:
  backend:
    build: ./backend
    container_name: nexus-inventory-backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
    # Jika butuh env file khusus:
    # env_file:
    #   - ./backend/.env
    # Opsi volume untuk pengembangan (opsional):
    # volumes:
    #   - ./backend/src:/app/src:ro
```

### Menjalankan
- Jalankan perintah berikut di root repo:
  - `docker compose up --build`
- Setelah container berjalan, server GraphQL biasanya tersedia di `http://localhost:4000/` (sesuaikan jika Anda mengganti port).
- Hentikan:
  - `docker compose down`
- Rebuild bila ada perubahan signifikan:
  - `docker compose build --no-cache`

## Menjalankan Secara Lokal (Tanpa Docker)
Skenario ini berguna untuk pengembangan cepat sebelum membuat image.

1) Siapkan `package.json` backend (contoh rekomendasi):
```
{
  "name": "nexus-inventory-backend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "graphql": "^16.0.0",
    "apollo-server": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.0.0"
  }
}
```

2) Install dependencies di folder `backend/`:
- `npm install`

3) Jalankan pengembangan (dev):
- `npm run dev`

4) Build dan start (produksi lokal):
- `npm run build`
- `npm run start`

Catatan: Sesuaikan dependencies dengan framework yang Anda pilih (misal Apollo Server, Yoga, atau lainnya).

## Alur Kerja Pengembangan
- Entry point backend: `backend/src/index.ts` — tempat inisialisasi server GraphQL.
- Skema GraphQL: letakkan definisi di `backend/src/typeDefs/*.graphql` dan agregasikan di `backend/src/typeDefs/index.ts`.
- Tambahkan resolver, service, dan koneksi database di struktur yang Anda inginkan (misal `backend/src/resolvers`, `backend/src/services`).

## Variabel Lingkungan
- `PORT`: default `4000`.
- `NODE_ENV`: `development` atau `production`.
- Tambahkan file `.env` bila diperlukan dan muat di aplikasi (misal via `dotenv`).

## Troubleshooting
- Port conflict: ubah `PORT` di env atau mapping `ports` di Compose.
- Rebuild tidak berefek: gunakan `docker compose build --no-cache` dan `docker compose up -d`.
- Docker Desktop tidak berjalan: pastikan WSL2 aktif dan restart Docker.
- Log container: `docker compose logs -f backend`.

## FAQ Singkat
- Mengapa server tidak muncul di `localhost:4000`?
  - Periksa apakah `PORT` di container dan mapping `ports` sesuai.
  - Pastikan entry point benar (`src/index.ts`) dan tidak error saat runtime.
- Bisakah hot-reload di Docker?
  - Untuk pengembangan, gunakan volume untuk mount `src` dan jalankan tooling seperti `ts-node-dev`.

## Langkah Berikutnya
- Mengisi `client/` (frontend) minggu depan.
- Memperkuat struktur backend (resolver, service, database).
- Menyempurnakan `Dockerfile` dan `docker-compose.yml` sesuai kebutuhan produksi.

## Progress Week 2

**Tujuan**
- Buat resolvers
- Buat query dan mutation
- Hubungkan ke database
- Setup Prisma
- Setup database koneksi

**Ringkasan Progress**
- Resolvers modular untuk `Product` dan `Transaction` selesai.
- Computed fields `totalStock` dan `isLowStock` dihitung real-time dari `StockItem`.
- Mutasi `transferStock` berjalan atomik dengan `prisma.$transaction`.
- Koneksi DB via `pg` adapter (`@prisma/adapter-pg`) dan `Pool` dari `DATABASE_URL`.
- Prisma v7 dikonfigurasi dengan `prisma.config.ts` dan `.env`.

**Optimisasi Runtime**
- Menghilangkan warning `--experimental-loader` dan deprecation `fs.Stats` dengan menjalankan hasil build JS murni, bukan `ts-node`.
- Import internal ESM memakai ekstensi `.js` agar Node dapat resolve di `dist` (`src/index.ts:8`, `src/index.ts:9`, `src/index.ts:26`).
- File `.graphql` dibaca dari `src` menggunakan `process.cwd()` (`src/index.ts:21`–`src/index.ts:23`) sehingga tidak perlu menyalin aset ke `dist`.

**Setup Database Koneksi**
- Edit `backend/.env`:
```
DATABASE_URL="postgresql://postgres@localhost:5432/inventory"
SHADOW_DATABASE_URL="postgresql://postgres@localhost:5432/inventory_shadow"
```
- pgAdmin4 (opsional):
  - Server Name: `Nexus`
  - Host: `localhost`
  - Port: `5432`
  - Username: `postgres`
  - Password: kosong (sesuai konfigurasi lokal Anda)
  - Maintenance DB: `postgres` atau langsung `inventory`

**Setup Prisma (v7)**
- Konfigurasi: `backend/prisma.config.ts:4`
  - `schema`: `prisma/schema.prisma`
  - `migrations.path`: `prisma/migrations`
  - `datasource.url`: dibaca dari `.env`
  - `datasource.shadowDatabaseUrl`: dibaca dari `.env`
- Perintah:
```
cd backend
npx prisma generate
npx prisma db push
```

**Hubungkan ke Database di Server**
- Inisialisasi Prisma Client dengan adapter `pg` dan injeksi ke Apollo context: `backend/src/index.ts:31` dan `backend/src/index.ts:62`
```
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter, log: ['error'] })
// context: async () => ({ prisma })
```

**Buat Resolvers**
- Product Resolver dengan computed fields: `backend/src/resolvers/product.ts:19`
  - `totalStock`: agregasi `_sum.quantity` dari `StockItem`
  - `isLowStock`: cek `(totalStock < 10)`
- Transaction Resolver dengan mutasi atomik: `backend/src/resolvers/transaction.ts:5`
  - Validasi stok sumber, `update` decrement, `upsert` increment, `create` audit `Transaction`

**Schema GraphQL**
- Root types dan operasi: `backend/src/typeDefs/index.ts:1`
- Tipe `Product` (+ computed fields): `backend/src/typeDefs/product.graphql:1`
- Tipe transaksi dan enum: `backend/src/typeDefs/transaction.graphql:1`
- Tipe warehouse dan stock item: `backend/src/typeDefs/warehouse.graphql:1`

**Query & Mutation Contoh**
- Ambil produk beserta computed fields:
```
query {
  products {
    id
    sku
    name
    totalStock
    isLowStock
  }
}
```
- Ambil produk by id:
```
query {
  product(id: "1") {
    id
    name
    totalStock
  }
}
```
- Transfer stok atomik:
```
mutation {
  transferStock(
    fromWarehouseId: "1"
    toWarehouseId: "2"
    productId: "1"
    quantity: 5
    note: "Rebalancing"
  ) {
    id
    type
    quantity
    product { id name }
    sourceWarehouse { id name }
    targetWarehouse { id name }
  }
}
```

**Menjalankan Server**
- Install dependencies (bila belum):
```
cd backend
npm install
npm install dotenv pg @prisma/adapter-pg @prisma/client prisma
```
- Generate client & sinkronkan schema:
```
npx prisma generate
npx prisma db push
```
- Start server:
```
npm start
```
- URL GraphQL: `http://localhost:4000/`

**Workflow Dev (Hot-Reload)**
- Jalankan kompilasi TypeScript kontinu:
```
cd backend
npx tsc -w
```
- Jalankan aplikasi dan reload saat `dist` berubah:
```
npx nodemon --watch dist --exec "node dist/index.js"
```

**Troubleshooting**
- P1010 "User was denied access": gunakan user `postgres` lokal atau beri hak ke user aplikasi, lalu jalankan `npx prisma db push`.
- Error Prisma v7 "engine type client"/adapter: pastikan memakai `@prisma/adapter-pg` seperti pada `backend/src/index.ts:31`.
- TypeScript `rootDir` error untuk `prisma.config.ts`: pastikan `backend/tsconfig.json` hanya `include: ["src/**/*"]` dan exclude `prisma.config.ts`.
 - ENOENT saat membaca `.graphql` di `dist`: pastikan path membaca skema menggunakan `process.cwd()` seperti pada `backend/src/index.ts:21`–`23`.

**Catatan**
- Untuk produksi, gunakan user aplikasi terpisah dengan password kuat dan batasi privilege.
- Pertimbangkan migrasi berbasis `npx prisma migrate dev` untuk lingkungan pengembangan.
