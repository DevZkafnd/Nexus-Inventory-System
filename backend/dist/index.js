import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { productResolvers } from './resolvers/product.js';
import { transactionResolvers } from './resolvers/transaction.js';
import { userResolvers } from './resolvers/user.js';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { GraphQLScalarType, Kind } from 'graphql';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
process.env.PRISMA_CLIENT_ENGINE_TYPE = process.env.PRISMA_CLIENT_ENGINE_TYPE || 'library';
// [2] --- PERBAIKAN DI SINI: Ciptakan __dirname secara manual ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -------------------------------------------------------------
// Baca skema dari sumber (src) agar tidak bergantung pada lokasi build
const productSchema = readFileSync(path.resolve(process.cwd(), 'src/typeDefs/product.graphql'), { encoding: 'utf-8' });
const warehouseSchema = readFileSync(path.resolve(process.cwd(), 'src/typeDefs/warehouse.graphql'), { encoding: 'utf-8' });
const transactionSchema = readFileSync(path.resolve(process.cwd(), 'src/typeDefs/transaction.graphql'), { encoding: 'utf-8' });
const userSchema = readFileSync(path.resolve(process.cwd(), 'src/typeDefs/user.graphql'), { encoding: 'utf-8' });
// Import rootTypeDefs (yang isinya Query & Mutation)
import { rootTypeDefs } from './typeDefs/index.js';
// Gabungkan semua jadi satu
const typeDefs = [rootTypeDefs, productSchema, warehouseSchema, transactionSchema, userSchema];
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['error'] });
async function waitForDb() {
    const max = 30;
    for (let i = 0; i < max; i++) {
        try {
            await pool.query('SELECT 1');
            return;
        }
        catch (e) {
            await new Promise((r) => setTimeout(r, 1000));
        }
    }
    throw new Error('Database tidak siap setelah menunggu 30 detik');
}
async function ensureWarehouseCodes() {
    const toFix = await prisma.warehouse.findMany({ where: { code: null } });
    for (const w of toFix) {
        const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
        const base = (w.name || 'WH').replace(/\s+/g, '-').slice(0, 6).toUpperCase();
        const code = `WH-${base}-${suffix}`;
        await prisma.warehouse.update({ where: { id: w.id }, data: { code } });
    }
}
const resolvers = {
    Query: {
        ...(productResolvers.Query || {}),
        ...(transactionResolvers.Query || {}),
        ...(userResolvers.Query || {}),
    },
    Mutation: {
        ...(productResolvers.Mutation || {}),
        ...(transactionResolvers.Mutation || {}),
        ...(userResolvers.Mutation || {}),
    },
    Product: productResolvers.Product,
    User: userResolvers.User,
    Date: new GraphQLScalarType({
        name: 'Date',
        serialize: (value) => new Date(value).toISOString(),
        parseValue: (value) => new Date(value),
        parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
    }),
};
async function ensurePlaygroundSeed() {
    const wA = await prisma.warehouse.findFirst({ where: { name: 'Gudang Playground A' } });
    const wB = await prisma.warehouse.findFirst({ where: { name: 'Gudang Playground B' } });
    const warehouseA = wA ??
        (await prisma.warehouse.create({
            data: { name: 'Gudang Playground A', location: 'Jakarta', capacity: 100, code: 'WH-PLAY-A' },
        }));
    const warehouseB = wB ??
        (await prisma.warehouse.create({
            data: { name: 'Gudang Playground B', location: 'Bandung', capacity: 80, code: 'WH-PLAY-B' },
        }));
    if (!warehouseA.code) {
        await prisma.warehouse.update({ where: { id: warehouseA.id }, data: { code: 'WH-PLAY-A' } });
    }
    if (!warehouseB.code) {
        await prisma.warehouse.update({ where: { id: warehouseB.id }, data: { code: 'WH-PLAY-B' } });
    }
    const product = await prisma.product.upsert({
        where: { sku: 'SKU-PLAYGROUND-1' },
        update: {},
        create: { sku: 'SKU-PLAYGROUND-1', name: 'Produk Playground', category: 'Kategori', priceCents: 1250 },
    });
    return { warehouseAId: warehouseA.id, warehouseBId: warehouseB.id, productId: product.id };
}
async function ensureAdminSeed() {
    const email = 'admin@contoh.com';
    const existing = await prisma.user.findUnique({ where: { email } });
    const name = 'Zaki Affandi';
    const role = 'ADMIN';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin1234';
    const { randomBytes, pbkdf2Sync } = await import('crypto');
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(defaultPassword, salt, 120000, 32, 'sha256').toString('hex');
    if (existing) {
        await prisma.user.update({
            where: { id: existing.id },
            data: { name, role, passwordSalt: salt, passwordHash: hash },
        });
        return existing.id;
    }
    else {
        const user = await prisma.user.create({
            data: { email, name, role, passwordSalt: salt, passwordHash: hash },
        });
        return user.id;
    }
}
await waitForDb();
await ensureWarehouseCodes();
const seed = await ensurePlaygroundSeed();
await ensureAdminSeed();
const defaultDocument = `
# Langkah awal: cek data seed yang sudah disiapkan
query SeedCheck {
  products { id sku name price }
  warehouses { id name location capacity code }
}

# Contoh create, bisa diubah nilainya sebelum run
mutation CreateWarehouseSample {
  createWarehouse(name: "Gudang Sample", location: "Surabaya", code: "WH-SAMPLE-01", capacity: 120) { id name location capacity code }
}

mutation CreateProductSample {
  createProduct(sku: "SKU-SAMPLE-001", name: "Produk Sample", category: "Kategori", price: 12.5) { id sku name category price }
}

# Operasi yang langsung bisa jalan menggunakan ID seed
mutation InboundStockPlayground {
  inboundStock(warehouseId: "${seed.warehouseAId}", productId: "${seed.productId}", quantity: 10, note: "Restock") {
    id type quantity timestamp referenceNote
  }
}

mutation OutboundStockPlayground {
  outboundStock(warehouseId: "${seed.warehouseAId}", productId: "${seed.productId}", quantity: 5, note: "Kirim") {
    id type quantity timestamp referenceNote
  }
}

mutation TransferStockPlayground {
  transferStock(fromWarehouseId: "${seed.warehouseAId}", toWarehouseId: "${seed.warehouseBId}", productId: "${seed.productId}", quantity: 3, note: "Mutasi") {
    id type quantity sourceWarehouse { id name } targetWarehouse { id name } referenceNote
  }
}

mutation UpdateProductPlayground {
  updateProduct(id: "${seed.productId}", name: "Nama Baru Playground", price: 99.99, category: "Kategori Baru") {
    id name price category
  }
}
`;
// Inisiasi Server
const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    plugins: [
        ApolloServerPluginLandingPageLocalDefault({
            embed: true,
            document: defaultDocument,
        }),
    ],
});
// Jalankan Server dengan top-level await (Fitur modern)
const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => {
        const header = req.headers['x-user-id'];
        const userId = Array.isArray(header) ? header[0] : header;
        return { prisma, userId: typeof userId === 'string' ? userId : undefined };
    },
});
console.log(`🚀  Server Nexus Inventory jalan di: ${url}`);
