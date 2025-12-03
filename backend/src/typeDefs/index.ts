// Kita bungkus pakai #graphql supaya VS Code ngasih warna, tapi ini string valid.
export const rootTypeDefs = `#graphql
  type Query {
    warehouses: [Warehouse]
    products: [Product]
    product(id: ID!): Product
    transactions(limit: Int): [StockTransaction]
  }

  type Mutation {
    # Master Data
    createWarehouse(name: String!, location: String!, capacity: Int): Warehouse
    createProduct(sku: String!, name: String!, category: String, price: Float): Product

    # Core Business Logic
    inboundStock(warehouseId: ID!, productId: ID!, quantity: Int!, note: String): StockTransaction
    outboundStock(warehouseId: ID!, productId: ID!, quantity: Int!, note: String): StockTransaction
    transferStock(fromWarehouseId: ID!, toWarehouseId: ID!, productId: ID!, quantity: Int!, note: String): StockTransaction
  }
`;