export const productResolvers = {
    Query: {
        products: async (_, __, { prisma }) => {
            return await prisma.product.findMany({ where: { isDeleted: false } });
        },
        product: async (_, { id }, { prisma }) => {
            return await prisma.product.findUnique({ where: { id } });
        },
    },
    Product: {
        price: async (parent, _, __) => {
            if (parent.priceCents == null)
                return null;
            return Math.round(parent.priceCents) / 100;
        },
        totalStock: async (parent, _, { prisma }) => {
            const aggregate = await prisma.stockItem.aggregate({
                _sum: { quantity: true },
                where: { productId: parent.id },
            });
            return aggregate._sum.quantity || 0;
        },
        isLowStock: async (parent, _, { prisma }) => {
            const aggregate = await prisma.stockItem.aggregate({
                _sum: { quantity: true },
                where: { productId: parent.id },
            });
            return (aggregate._sum.quantity || 0) < 10;
        },
    },
    Mutation: {
        createProduct: async (_, args, { prisma }) => {
            const priceCents = args.price != null ? Math.round(args.price * 100) : null;
            const initial = args.initialStock && args.initialStock > 0 ? args.initialStock : 0;
            if (args.initialStock != null && args.initialStock < 0)
                throw new Error('Initial stock tidak boleh negatif.');
            const wId = args.warehouseId;
            return await prisma.$transaction(async (tx) => {
                const product = await tx.product.create({
                    data: { sku: args.sku, name: args.name, category: args.category ?? null, priceCents },
                });
                if (initial > 0 && wId) {
                    await tx.stockItem.upsert({
                        where: { productId_warehouseId: { productId: product.id, warehouseId: wId } },
                        update: { quantity: { increment: initial } },
                        create: { productId: product.id, warehouseId: wId, quantity: initial },
                    });
                    await tx.transaction.create({
                        data: {
                            type: 'INITIAL_ADJUSTMENT',
                            productId: product.id,
                            sourceWarehouseId: null,
                            targetWarehouseId: wId,
                            quantity: initial,
                            referenceNote: 'Initial stock saat createProduct',
                        },
                    });
                }
                return product;
            });
        },
        updateProduct: async (_, { id, name, price, category }, { prisma }) => {
            const priceCents = price != null ? Math.round(price * 100) : undefined;
            return await prisma.product.update({
                where: { id },
                data: {
                    name,
                    priceCents,
                    category,
                },
            });
        },
        deleteProduct: async (_, args, { prisma }) => {
            const agg = await prisma.stockItem.aggregate({ _sum: { quantity: true }, where: { productId: args.id } });
            if ((agg._sum.quantity || 0) > 0)
                throw new Error('Stok masih ada, tidak bisa hapus produk.');
            await prisma.product.update({ where: { id: args.id }, data: { isDeleted: true } });
            return true;
        },
    },
};
