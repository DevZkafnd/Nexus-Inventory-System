// Kita bungkus pakai #graphql supaya VS Code ngasih warna, tapi ini string valid.
export const rootTypeDefs = `#graphql
  type Query {
    warehouses: [Warehouse]
    products: [Product]
    product(id: ID!): Product
    transactions(limit: Int): [StockTransaction]
    me: User
    users: [User]
    user(id: ID!): User
  }

  type Mutation {
    # Master Data
    createWarehouse(name: String!, location: String!, code: String!, capacity: Int): Warehouse
    updateWarehouse(id: ID!, name: String, location: String, code: String, capacity: Int): Warehouse
    deleteWarehouse(id: ID!): Boolean
    createProduct(sku: String!, name: String!, category: String, price: Float, initialStock: Int, warehouseId: ID): Product
    updateProduct(
      id: ID!
      name: String
      price: Float
      category: String
    ): Product
    deleteProduct(id: ID!): Boolean

    # Core Business Logic
    inboundStock(warehouseId: ID!, productId: ID!, quantity: Int!, note: String): StockTransaction
    outboundStock(warehouseId: ID!, productId: ID!, quantity: Int!, note: String): StockTransaction
    transferStock(fromWarehouseId: ID!, toWarehouseId: ID!, productId: ID!, quantity: Int!, note: String): StockTransaction

    # User Management
    createUser(email: String!, name: String, role: Role!, password: String!): User
    assignStaffToWarehouse(userId: ID!, warehouseId: ID!): Boolean
    unassignStaffFromWarehouse(userId: ID!, warehouseId: ID!): Boolean
    login(email: String!, password: String!): String
  }
`;
