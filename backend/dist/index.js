import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { productResolvers } from './resolvers/product.js';
import { transactionResolvers } from './resolvers/transaction.js';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { GraphQLScalarType, Kind } from 'graphql';
process.env.PRISMA_CLIENT_ENGINE_TYPE = process.env.PRISMA_CLIENT_ENGINE_TYPE || 'library';
// [2] --- PERBAIKAN DI SINI: Ciptakan __dirname secara manual ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -------------------------------------------------------------
// Baca skema dari sumber (src) agar tidak bergantung pada lokasi build
const productSchema = readFileSync(path.resolve(process.cwd(), 'src/typeDefs/product.graphql'), { encoding: 'utf-8' });
const warehouseSchema = readFileSync(path.resolve(process.cwd(), 'src/typeDefs/warehouse.graphql'), { encoding: 'utf-8' });
const transactionSchema = readFileSync(path.resolve(process.cwd(), 'src/typeDefs/transaction.graphql'), { encoding: 'utf-8' });
// Import rootTypeDefs (yang isinya Query & Mutation)
import { rootTypeDefs } from './typeDefs/index.js';
// Gabungkan semua jadi satu
const typeDefs = [rootTypeDefs, productSchema, warehouseSchema, transactionSchema];
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['error'] });
const resolvers = {
    Query: {
        ...(productResolvers.Query || {}),
        ...(transactionResolvers.Query || {}),
    },
    Mutation: {
        ...(productResolvers.Mutation || {}),
        ...(transactionResolvers.Mutation || {}),
    },
    Product: productResolvers.Product,
    Date: new GraphQLScalarType({
        name: 'Date',
        serialize: (value) => new Date(value).toISOString(),
        parseValue: (value) => new Date(value),
        parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
    }),
};
// Inisiasi Server
const server = new ApolloServer({
    typeDefs,
    resolvers,
});
// Jalankan Server dengan top-level await (Fitur modern)
const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({ prisma }),
});
console.log(`🚀  Server Nexus Inventory jalan di: ${url}`);
