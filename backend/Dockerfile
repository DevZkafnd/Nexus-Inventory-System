# Menggunakan node alpine agar ringan
FROM node:22-alpine

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
