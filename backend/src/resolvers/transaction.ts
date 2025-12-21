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
    stocks: async (
      parent: { id: string },
      _: unknown,
      { prisma }: { prisma: PrismaClient }
    ) => {
      const items = await prisma.stockItem.findMany({
        where: { warehouseId: parent.id },
        include: { product: true, warehouse: true },
        orderBy: [{ quantity: 'desc' }],
      })
      return items
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
      
      // Hapus StockItem yang terkait terlebih dahulu (karena constraint RESTRICT)
      // Kita sudah pastikan quantity 0, jadi aman untuk dihapus.
      await prisma.stockItem.deleteMany({ where: { warehouseId: args.id } })
      
      // Cek apakah ada relasi lain yang perlu dihapus (misal UserWarehouse)
      await prisma.userWarehouse.deleteMany({ where: { warehouseId: args.id } })

      // Putuskan relasi Transaction (Set Null) agar history tetap ada tapi gudang bisa dihapus
      await prisma.transaction.updateMany({
        where: { sourceWarehouseId: args.id },
        data: { sourceWarehouseId: null }
      })
      await prisma.transaction.updateMany({
        where: { targetWarehouseId: args.id },
        data: { targetWarehouseId: null }
      })

      await prisma.warehouse.delete({ where: { id: args.id } })
      return true
    },

 

    inboundStock: async (
      _: unknown,
      args: { warehouseId: string; productId: string; quantity: number; note?: string },
      { prisma, userId }: { prisma: PrismaClient; userId?: string }
    ) => {
      const quantity = args.quantity
      
      // Cari Gudang Utama (Prioritas: Code WH-GUDANG-UTAMA, lalu WH-MAIN, lalu nama mengandung Utama/Main/Pusat)
      let sourceWarehouse = await prisma.warehouse.findFirst({
        where: { code: 'WH-GUDANG-UTAMA' }
      })

      if (!sourceWarehouse) {
        sourceWarehouse = await prisma.warehouse.findFirst({
          where: { code: 'WH-MAIN' }
        })
      }

      if (!sourceWarehouse) {
        sourceWarehouse = await prisma.warehouse.findFirst({
          where: {
            OR: [
              { name: { contains: 'Utama', mode: 'insensitive' } },
              { name: { contains: 'Main', mode: 'insensitive' } },
              { name: { contains: 'Pusat', mode: 'insensitive' } }
            ]
          }
        })
      }

      // Fallback: Jika tidak ada yang namanya Utama/Main/Pusat, ambil gudang pertama yang dibuat
      if (!sourceWarehouse) {
        sourceWarehouse = await prisma.warehouse.findFirst({
          orderBy: { id: 'asc' } // Asumsi gudang pertama adalah pusat
        })
      }

      const isMainWarehouse = sourceWarehouse && sourceWarehouse.id === args.warehouseId

      return await prisma.$transaction(async (tx) => {
        // Skenario 1: Ini adalah Gudang Utama (atau sistem baru tanpa gudang lain), jadi stok masuk dari Supplier
        if (isMainWarehouse || !sourceWarehouse) {
           await tx.stockItem.upsert({
            where: { productId_warehouseId: { productId: args.productId, warehouseId: args.warehouseId } },
            update: { quantity: { increment: quantity } },
            create: { productId: args.productId, warehouseId: args.warehouseId, quantity },
          })
          const note = args.note ?? (userId ? `Inbound by staff ${userId} (Supplier)` : null)
          return await tx.transaction.create({
            data: {
              type: 'INBOUND',
              productId: args.productId,
              sourceWarehouseId: null,
              targetWarehouseId: args.warehouseId,
              quantity,
              referenceNote: note,
            },
          })
        }

        // Skenario 2: Ini Gudang Cabang, stok diambil dari Gudang Utama (Transfer)
        // Cek stok di Gudang Utama
        const sourceStock = await tx.stockItem.findUnique({
          where: { productId_warehouseId: { productId: args.productId, warehouseId: sourceWarehouse.id } },
        })

        if (!sourceStock || sourceStock.quantity < quantity) {
          throw new Error(`Stok di Gudang Utama (${sourceWarehouse.name}) tidak mencukupi. Sisa: ${sourceStock?.quantity || 0}`)
        }

        // Kurangi stok Gudang Utama
        await tx.stockItem.update({
          where: { productId_warehouseId: { productId: args.productId, warehouseId: sourceWarehouse.id } },
          data: { quantity: { decrement: quantity } },
        })

        // Tambah stok ke Gudang Cabang (Tujuan)
        await tx.stockItem.upsert({
          where: { productId_warehouseId: { productId: args.productId, warehouseId: args.warehouseId } },
          update: { quantity: { increment: quantity } },
          create: { productId: args.productId, warehouseId: args.warehouseId, quantity },
        })

        const note = args.note ?? (userId ? `Inbound by staff ${userId} from ${sourceWarehouse.name}` : null)
        
        // Catat sebagai TRANSFER karena perpindahan internal
        return await tx.transaction.create({
          data: {
            type: 'TRANSFER',
            productId: args.productId,
            sourceWarehouseId: sourceWarehouse.id,
            targetWarehouseId: args.warehouseId,
            quantity,
            referenceNote: note,
          },
          include: { product: true, sourceWarehouse: true, targetWarehouse: true },
        })
      })
    },

    outboundStock: async (
      _: unknown,
      args: { warehouseId: string; productId: string; quantity: number; note?: string },
      { prisma, userId }: { prisma: PrismaClient; userId?: string }
    ) => {
      const quantity = args.quantity
      return await prisma.$transaction(async (tx) => {
        const stock = await tx.stockItem.findUnique({
          where: { productId_warehouseId: { productId: args.productId, warehouseId: args.warehouseId } },
        })
        if (!stock || stock.quantity < quantity) throw new Error('Stok tidak mencukupi untuk outbound!')
        const updatedStock = await tx.stockItem.update({
          where: { productId_warehouseId: { productId: args.productId, warehouseId: args.warehouseId } },
          data: { quantity: { decrement: quantity } },
        })

        // LOGIKA BARU: Hapus stok dari cabang jika 0 DAN stok di Gudang Utama juga 0
        if (updatedStock.quantity === 0) {
            const mainWarehouse = await tx.warehouse.findFirst({ where: { code: 'WH-GUDANG-UTAMA' } })
            
            // Hanya berlaku jika ini BUKAN Gudang Utama
            if (mainWarehouse && args.warehouseId !== mainWarehouse.id) {
                const mainStock = await tx.stockItem.findUnique({
                    where: { productId_warehouseId: { productId: args.productId, warehouseId: mainWarehouse.id } }
                })
                
                // Jika Gudang Utama juga kosong (0 atau tidak ada record)
                if (!mainStock || mainStock.quantity === 0) {
                     await tx.stockItem.delete({
                        where: { productId_warehouseId: { productId: args.productId, warehouseId: args.warehouseId } }
                    })
                }
            }
        }
        const note = args.note ?? (userId ? `Outbound by staff ${userId}` : null)
        return await tx.transaction.create({
          data: {
            type: 'OUTBOUND',
            productId: args.productId,
            sourceWarehouseId: args.warehouseId,
            targetWarehouseId: null,
            quantity,
            referenceNote: note,
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

          const updatedSourceStock = await tx.stockItem.update({
            where: { productId_warehouseId: { productId: args.productId, warehouseId: args.fromWarehouseId } },
            data: { quantity: { decrement: quantity } },
          })

          // LOGIKA BARU: Hapus stok dari cabang jika 0 DAN stok di Gudang Utama juga 0
          if (updatedSourceStock.quantity === 0) {
              const mainWarehouse = await tx.warehouse.findFirst({ where: { code: 'WH-GUDANG-UTAMA' } })
              
              if (mainWarehouse && args.fromWarehouseId !== mainWarehouse.id) {
                  const mainStock = await tx.stockItem.findUnique({
                      where: { productId_warehouseId: { productId: args.productId, warehouseId: mainWarehouse.id } }
                  })
                  
                  if (!mainStock || mainStock.quantity === 0) {
                       await tx.stockItem.delete({
                          where: { productId_warehouseId: { productId: args.productId, warehouseId: args.fromWarehouseId } }
                      })
                  }
              }
          }

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
