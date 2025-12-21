import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Mencari Gudang Utama...')
  // 1. Find Main Warehouse
  const mainWh = await prisma.warehouse.findFirst({
    where: {
      OR: [
        { name: { contains: 'Utama', mode: 'insensitive' } },
        { name: { contains: 'Main', mode: 'insensitive' } },
        { name: { contains: 'Pusat', mode: 'insensitive' } }
      ]
    }
  })

  if (!mainWh) {
    console.error('Gudang Utama tidak ditemukan! Pastikan Anda sudah membuat gudang dengan nama "Utama", "Main", atau "Pusat".')
    process.exit(1)
  }

  console.log(`Target Gudang: ${mainWh.name} (ID: ${mainWh.id})`)

  // 2. Find all stocks in other warehouses
  const stocksToMove = await prisma.stockItem.findMany({
    where: {
      warehouseId: { not: mainWh.id },
      quantity: { gt: 0 }
    },
    include: { product: true, warehouse: true }
  })

  if (stocksToMove.length === 0) {
    console.log('Tidak ada stok di gudang lain yang perlu dipindahkan.')
    return
  }

  console.log(`Ditemukan ${stocksToMove.length} item stok di gudang cabang yang akan ditarik ke Pusat.`)

  // 3. Move them
  for (const stock of stocksToMove) {
    await prisma.$transaction(async (tx) => {
      // Decrement Source (Set to 0)
      await tx.stockItem.update({
        where: { id: stock.id },
        data: { quantity: 0 }
      })

      // Increment Target
      await tx.stockItem.upsert({
        where: {
          productId_warehouseId: {
            productId: stock.productId,
            warehouseId: mainWh.id
          }
        },
        create: {
          productId: stock.productId,
          warehouseId: mainWh.id,
          quantity: stock.quantity
        },
        update: {
          quantity: { increment: stock.quantity }
        }
      })

      // Record Transaction
      await tx.transaction.create({
        data: {
          type: 'TRANSFER',
          productId: stock.productId,
          sourceWarehouseId: stock.warehouseId,
          targetWarehouseId: mainWh.id,
          quantity: stock.quantity,
          referenceNote: `AUTO-CONSOLIDATION: Pindah dari ${stock.warehouse.name} ke ${mainWh.name}`
        }
      })
    })
    console.log(`[BERHASIL] ${stock.quantity}x ${stock.product.name} dipindahkan dari ${stock.warehouse.name}`)
  }
  
  console.log('Semua stok berhasil dipindahkan ke Gudang Utama.')
}

main()
  .catch(e => {
      console.error(e)
      process.exit(1)
  })
  .finally(async () => await prisma.$disconnect())
