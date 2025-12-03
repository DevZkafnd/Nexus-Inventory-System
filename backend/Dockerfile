# Menggunakan node alpine agar ringan
FROM node:18-alpine

WORKDIR /app

# Copy package.json & install dependencies
COPY package*.json ./
RUN npm install

# Copy semua source code
COPY . .

# Expose port 4000 (Sesuai laporan)
EXPOSE 4000

# Jalankan aplikasi
CMD ["npm", "start"]
