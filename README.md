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
