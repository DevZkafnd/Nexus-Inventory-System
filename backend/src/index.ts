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

// Import rootTypeDefs (yang isinya Query & Mutation)
import { rootTypeDefs } from './typeDefs/index.js';

// Gabungkan semua jadi satu
const typeDefs = [rootTypeDefs, productSchema, warehouseSchema, transactionSchema];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['error'] });

const resolvers = {
  Query: {
    ...(((productResolvers as unknown) as any).Query || {}),
    ...(((transactionResolvers as unknown) as any).Query || {}),
  },
  Mutation: {
    ...(((productResolvers as unknown) as any).Mutation || {}),
    ...(((transactionResolvers as unknown) as any).Mutation || {}),
  },
  Product: ((productResolvers as unknown) as any).Product,
  Date: new GraphQLScalarType({
    name: 'Date',
    serialize: (value: unknown) => new Date(value as any).toISOString(),
    parseValue: (value: unknown) => new Date(value as any),
    parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
  }),
};

async function ensurePlaygroundSeed() {
  const wA = await prisma.warehouse.findFirst({ where: { name: 'Gudang Playground A' } })
  const wB = await prisma.warehouse.findFirst({ where: { name: 'Gudang Playground B' } })
  const warehouseA = wA ?? (await prisma.warehouse.create({ data: { name: 'Gudang Playground A', location: 'Jakarta', capacity: 100 } }))
  const warehouseB = wB ?? (await prisma.warehouse.create({ data: { name: 'Gudang Playground B', location: 'Bandung', capacity: 80 } }))

  const product = await prisma.product.upsert({
    where: { sku: 'SKU-PLAYGROUND-1' },
    update: {},
    create: { sku: 'SKU-PLAYGROUND-1', name: 'Produk Playground', category: 'Kategori', priceCents: 1250 },
  })

  return { warehouseAId: warehouseA.id, warehouseBId: warehouseB.id, productId: product.id }
}

const seed = await ensurePlaygroundSeed()

const defaultDocument = `
# Langkah awal: cek data seed yang sudah disiapkan
query SeedCheck {
  products { id sku name price }
  warehouses { id name location capacity }
}

# Contoh create, bisa diubah nilainya sebelum run
mutation CreateWarehouseSample {
  createWarehouse(name: "Gudang Sample", location: "Surabaya", capacity: 120) { id name location capacity }
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
  context: async () => ({ prisma }),
});

console.log(`🚀  Server Nexus Inventory jalan di: ${url}`);
