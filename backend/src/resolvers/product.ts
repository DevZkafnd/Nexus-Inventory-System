import type { PrismaClient } from '@prisma/client'

export const productResolvers = {
  Query: {
    products: async (_: unknown, __: unknown, { prisma }: { prisma: PrismaClient }) => {
      return await prisma.product.findMany()
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
  },

  Mutation: {
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
  },
}
