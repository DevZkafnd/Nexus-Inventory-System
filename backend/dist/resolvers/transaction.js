export const transactionResolvers = {
    Mutation: {
        createWarehouse: async (_, args, { prisma }) => {
            return await prisma.warehouse.create({
                data: { name: args.name, location: args.location, capacity: args.capacity ?? null },
            });
        },
        createProduct: async (_, args, { prisma }) => {
            const priceCents = args.price != null ? Math.round(args.price * 100) : null;
            return await prisma.product.create({
                data: { sku: args.sku, name: args.name, category: args.category ?? null, priceCents },
            });
        },
        inboundStock: async (_, args, { prisma }) => {
            const quantity = args.quantity;
            return await prisma.$transaction(async (tx) => {
                await tx.stockItem.upsert({
                    where: { productId_warehouseId: { productId: args.productId, warehouseId: args.warehouseId } },
                    update: { quantity: { increment: quantity } },
                    create: { productId: args.productId, warehouseId: args.warehouseId, quantity },
                });
                return await tx.transaction.create({
                    data: {
                        type: 'INBOUND',
                        productId: args.productId,
                        sourceWarehouseId: null,
                        targetWarehouseId: args.warehouseId,
                        quantity,
                        referenceNote: args.note ?? null,
                    },
                });
            });
        },
        outboundStock: async (_, args, { prisma }) => {
            const quantity = args.quantity;
            return await prisma.$transaction(async (tx) => {
                const stock = await tx.stockItem.findUnique({
                    where: { productId_warehouseId: { productId: args.productId, warehouseId: args.warehouseId } },
                });
                if (!stock || stock.quantity < quantity)
                    throw new Error('Stok tidak mencukupi untuk outbound!');
                await tx.stockItem.update({
                    where: { productId_warehouseId: { productId: args.productId, warehouseId: args.warehouseId } },
                    data: { quantity: { decrement: quantity } },
                });
                return await tx.transaction.create({
                    data: {
                        type: 'OUTBOUND',
                        productId: args.productId,
                        sourceWarehouseId: args.warehouseId,
                        targetWarehouseId: null,
                        quantity,
                        referenceNote: args.note ?? null,
                    },
                });
            });
        },
        transferStock: async (_, args, { prisma }) => {
            const quantity = args.quantity;
            const note = args.note ?? undefined;
            return await prisma.$transaction(async (tx) => {
                const sourceStock = await tx.stockItem.findUnique({
                    where: { productId_warehouseId: { productId: args.productId, warehouseId: args.fromWarehouseId } },
                });
                if (!sourceStock || sourceStock.quantity < quantity) {
                    throw new Error('Stok tidak mencukupi untuk transfer!');
                }
                await tx.stockItem.update({
                    where: { productId_warehouseId: { productId: args.productId, warehouseId: args.fromWarehouseId } },
                    data: { quantity: { decrement: quantity } },
                });
                await tx.stockItem.upsert({
                    where: { productId_warehouseId: { productId: args.productId, warehouseId: args.toWarehouseId } },
                    update: { quantity: { increment: quantity } },
                    create: { productId: args.productId, warehouseId: args.toWarehouseId, quantity },
                });
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
                });
            });
        },
    },
};
