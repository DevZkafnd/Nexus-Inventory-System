import type { PrismaClient } from '@prisma/client'

export const productResolvers = {
  Query: {
    products: async (_: unknown, __: unknown, { prisma }: { prisma: PrismaClient }) => {
      return await prisma.product.findMany({ where: { isDeleted: false } })
    },
    productBySku: async (_: unknown, { sku }: { sku: string }, { prisma }: { prisma: PrismaClient }) => {
      return await prisma.product.findUnique({ where: { sku } })
    },
    product: async (
      _: unknown,
      { id }: { id: string },
      { prisma }: { prisma: PrismaClient }
    ) => {
      return await prisma.product.findUnique({ where: { id } })
    },
  },

  Product: {
    price: async (
      parent: { priceCents?: number | null },
      _: unknown,
      __: unknown
    ) => {
      if (parent.priceCents == null) return null
      return Math.round(parent.priceCents) / 100
    },
    totalStock: async (
      parent: { id: string },
      _: unknown,
      { prisma }: { prisma: PrismaClient }
    ) => {
      const aggregate = await prisma.stockItem.aggregate({
        _sum: { quantity: true },
        where: { productId: parent.id },
      })
      return aggregate._sum.quantity || 0
    },
    isLowStock: async (
      parent: { id: string },
      _: unknown,
      { prisma }: { prisma: PrismaClient }
    ) => {
      const aggregate = await prisma.stockItem.aggregate({
        _sum: { quantity: true },
        where: { productId: parent.id },
      })
      return (aggregate._sum.quantity || 0) < 10
    },
    stocks: async (
      parent: { id: string },
      _: unknown,
      { prisma }: { prisma: PrismaClient }
    ) => {
      return await prisma.stockItem.findMany({
        where: { productId: parent.id },
        include: { warehouse: true, product: true },
      })
    },
  },

  Mutation: {
    createProduct: async (
      _: unknown,
      args: { sku: string; name: string; category?: string; price?: number; initialStock?: number; warehouseId?: string },
      { prisma }: { prisma: PrismaClient }
    ) => {
      const priceCents = args.price != null ? Math.round(args.price * 100) : null
      const initial = args.initialStock && args.initialStock > 0 ? args.initialStock : 0
      if (args.initialStock != null && args.initialStock < 0) throw new Error('Initial stock tidak boleh negatif.')
      const wId = args.warehouseId
      return await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: { sku: args.sku, name: args.name, category: args.category ?? null, priceCents },
        })
        if (initial > 0 && wId) {
          await tx.stockItem.upsert({
            where: { productId_warehouseId: { productId: product.id, warehouseId: wId } },
            update: { quantity: { increment: initial } },
            create: { productId: product.id, warehouseId: wId, quantity: initial },
          })
          await tx.transaction.create({
            data: {
              type: 'INITIAL_ADJUSTMENT',
              productId: product.id,
              sourceWarehouseId: null,
              targetWarehouseId: wId,
              quantity: initial,
              referenceNote: 'Initial stock saat createProduct',
            },
          })
        }
        return product
      })
    },
    updateProduct: async (_: any, { id, name, price, category }: any, { prisma }: { prisma: PrismaClient }) => {
      const priceCents = price != null ? Math.round(price * 100) : undefined
      return await prisma.product.update({
        where: { id },
        data: {
          name,
          priceCents,
          category,
        },
      });
    },
    deleteProduct: async (
      _: unknown,
      args: { id: string },
      { prisma }: { prisma: PrismaClient }
    ) => {
      const agg = await prisma.stockItem.aggregate({ _sum: { quantity: true }, where: { productId: args.id } })
      if ((agg._sum.quantity || 0) > 0) throw new Error('Stok masih ada, tidak bisa hapus produk.')
      await prisma.product.update({ where: { id: args.id }, data: { isDeleted: true } })
      return true
    },
  },
}
