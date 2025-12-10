export const productResolvers = {
    Query: {
        products: async (_, __, { prisma }) => {
            return await prisma.product.findMany();
        },
        product: async (_, { id }, { prisma }) => {
            return await prisma.product.findUnique({ where: { id } });
        },
    },
    Product: {
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
        updateProduct: async (_, { id, name, price: priceCents, category }, { prisma }) => {
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
};
