# Menggunakan Debian-based image agar kompatibel dengan Prisma Node-API (library engine)
FROM node:22-bookworm-slim

WORKDIR /app

# Copy package.json & install dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy semua source code
COPY . .

# Expose port 4000 (Sesuai laporan)
EXPOSE 4000

# Jalankan aplikasi
CMD ["npm", "start"]
