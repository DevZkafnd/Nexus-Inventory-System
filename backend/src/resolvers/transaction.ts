import type { PrismaClient } from '@prisma/client'

export const transactionResolvers = {
  Query: {
    warehouses: async (_: unknown, __: unknown, { prisma }: { prisma: PrismaClient }) => {
      return await prisma.warehouse.findMany()
    },
    transactions: async (
      _: unknown,
      args: { limit?: number },
      { prisma }: { prisma: PrismaClient }
    ) => {
      const take = args.limit && args.limit > 0 ? args.limit : undefined
      return await prisma.transaction.findMany({
        orderBy: { timestamp: 'desc' },
        take,
      })
    },
  },
  Warehouse: {
    staffs: async (
      parent: { id: string },
      _: unknown,
      { prisma }: { prisma: PrismaClient }
    ) => {
      const links = await prisma.userWarehouse.findMany({ where: { warehouseId: parent.id } })
      if (links.length === 0) return []
      const userIds = links.map((l) => l.userId)
      return await prisma.user.findMany({
        where: { id: { in: userIds }, role: 'STAFF' },
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
      })
    },
  },
  Mutation: {
    createWarehouse: async (
      _: unknown,
      args: { name: string; location: string; code: string; capacity?: number },
      { prisma }: { prisma: PrismaClient }
    ) => {
      return await prisma.warehouse.create({
        data: { name: args.name, location: args.location, code: args.code, capacity: args.capacity ?? null },
      })
    },
    updateWarehouse: async (
      _: unknown,
      args: { id: string; name?: string; location?: string; code?: string; capacity?: number },
      { prisma }: { prisma: PrismaClient }
    ) => {
      return await prisma.warehouse.update({
        where: { id: args.id },
        data: { name: args.name, location: args.location, code: args.code, capacity: args.capacity ?? undefined },
      })
    },
    deleteWarehouse: async (
      _: unknown,
      args: { id: string },
      { prisma }: { prisma: PrismaClient }
    ) => {
      const stocks = await prisma.stockItem.aggregate({ _sum: { quantity: true }, where: { warehouseId: args.id } })
      if ((stocks._sum.quantity || 0) > 0) throw new Error('Masih ada stok di gudang ini, tidak bisa dihapus.')
      await prisma.warehouse.delete({ where: { id: args.id } })
      return true
    },

 

    inboundStock: async (
      _: unknown,
      args: { warehouseId: string; productId: string; quantity: number; note?: string },
      { prisma }: { prisma: PrismaClient }
    ) => {
      const quantity = args.quantity
      return await prisma.$transaction(async (tx) => {
        await tx.stockItem.upsert({
          where: { productId_warehouseId: { productId: args.productId, warehouseId: args.warehouseId } },
          update: { quantity: { increment: quantity } },
          create: { productId: args.productId, warehouseId: args.warehouseId, quantity },
        })
        return await tx.transaction.create({
          data: {
            type: 'INBOUND',
            productId: args.productId,
            sourceWarehouseId: null,
            targetWarehouseId: args.warehouseId,
            quantity,
            referenceNote: args.note ?? null,
          },
        })
      })
    },

    outboundStock: async (
      _: unknown,
      args: { warehouseId: string; productId: string; quantity: number; note?: string },
      { prisma }: { prisma: PrismaClient }
    ) => {
      const quantity = args.quantity
      return await prisma.$transaction(async (tx) => {
        const stock = await tx.stockItem.findUnique({
          where: { productId_warehouseId: { productId: args.productId, warehouseId: args.warehouseId } },
        })
        if (!stock || stock.quantity < quantity) throw new Error('Stok tidak mencukupi untuk outbound!')
        await tx.stockItem.update({
          where: { productId_warehouseId: { productId: args.productId, warehouseId: args.warehouseId } },
          data: { quantity: { decrement: quantity } },
        })
        return await tx.transaction.create({
          data: {
            type: 'OUTBOUND',
            productId: args.productId,
            sourceWarehouseId: args.warehouseId,
            targetWarehouseId: null,
            quantity,
            referenceNote: args.note ?? null,
          },
        })
      })
    },

    transferStock: async (
      _: unknown,
      args: {
        fromWarehouseId: string
        toWarehouseId: string
        productId: string
        quantity: number
        note?: string
      },
      { prisma }: { prisma: PrismaClient }
    ) => {
      const quantity = args.quantity
        const note = args.note ?? undefined

        return await prisma.$transaction(async (tx) => {
          const sourceStock = await tx.stockItem.findUnique({
            where: { productId_warehouseId: { productId: args.productId, warehouseId: args.fromWarehouseId } },
          })

          if (!sourceStock || sourceStock.quantity < quantity) {
            throw new Error('Stok tidak mencukupi untuk transfer!')
          }

          await tx.stockItem.update({
            where: { productId_warehouseId: { productId: args.productId, warehouseId: args.fromWarehouseId } },
            data: { quantity: { decrement: quantity } },
          })

          await tx.stockItem.upsert({
            where: { productId_warehouseId: { productId: args.productId, warehouseId: args.toWarehouseId } },
            update: { quantity: { increment: quantity } },
            create: { productId: args.productId, warehouseId: args.toWarehouseId, quantity },
          })

          return await tx.transaction.create({
            data: {
              type: 'TRANSFER',
              productId: args.productId,
              sourceWarehouseId: args.fromWarehouseId,
              targetWarehouseId: args.toWarehouseId,
              quantity,
              referenceNote: note,
            },
            include: { product: true, sourceWarehouse: true, targetWarehouse: true },
          })
        })
      },
    },
  StockTransaction: {
    product: async (
      parent: { productId: string },
      _: unknown,
      { prisma }: { prisma: PrismaClient }
    ) => {
      return await prisma.product.findUnique({ where: { id: parent.productId } })
    },
    sourceWarehouse: async (
      parent: { sourceWarehouseId?: string | null },
      _: unknown,
      { prisma }: { prisma: PrismaClient }
    ) => {
      if (!parent.sourceWarehouseId) return null
      return await prisma.warehouse.findUnique({ where: { id: parent.sourceWarehouseId } })
    },
    targetWarehouse: async (
      parent: { targetWarehouseId?: string | null },
      _: unknown,
      { prisma }: { prisma: PrismaClient }
    ) => {
      if (!parent.targetWarehouseId) return null
      return await prisma.warehouse.findUnique({ where: { id: parent.targetWarehouseId } })
    },
  },
}
