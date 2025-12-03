import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // [1] Import helper URL

// [2] --- PERBAIKAN DI SINI: Ciptakan __dirname secara manual ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -------------------------------------------------------------

// Sekarang __dirname sudah bisa dipakai seperti biasa
const productSchema = readFileSync(path.resolve(__dirname, './typeDefs/product.graphql'), { encoding: 'utf-8' });
const warehouseSchema = readFileSync(path.resolve(__dirname, './typeDefs/warehouse.graphql'), { encoding: 'utf-8' });
const transactionSchema = readFileSync(path.resolve(__dirname, './typeDefs/transaction.graphql'), { encoding: 'utf-8' });

// Import rootTypeDefs (yang isinya Query & Mutation)
import { rootTypeDefs } from './typeDefs/index.js'; // Note: di ESM kadang butuh .js, tapi coba dulu tanpa .js jika ts-node sudah pintar

// Gabungkan semua jadi satu
const typeDefs = [rootTypeDefs, productSchema, warehouseSchema, transactionSchema];

// Resolvers Sementara
const resolvers = {
  Query: {
    warehouses: () => [],
    products: () => [],
  },
};

// Inisiasi Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Jalankan Server dengan top-level await (Fitur modern)
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀  Server Nexus Inventory jalan di: ${url}`);