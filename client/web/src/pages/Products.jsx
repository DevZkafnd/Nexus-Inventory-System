import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Plus, Edit, Trash2, X, Search, Package } from 'lucide-react';

const PRODUCTS_QUERY = gql`
  query GetProducts {
    products {
      id
      sku
      name
      category
      price
      stocks {
        quantity
        warehouse {
          id
          name
          code
        }
      }
    }
  }
`;

const WAREHOUSES_QUERY = gql`
  query GetWarehouses {
    warehouses {
      id
      name
      code
    }
  }
`;

const CREATE_PRODUCT = gql`
  mutation CreateProduct($sku: String!, $name: String!, $category: String!, $price: Float!, $initialStock: Int, $warehouseId: ID!) {
    createProduct(sku: $sku, name: $name, category: $category, price: $price, initialStock: $initialStock, warehouseId: $warehouseId) {
      id
      sku
      name
      category
      price
    }
  }
`;

const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $name: String, $price: Float, $category: String) {
    updateProduct(id: $id, name: $name, price: $price, category: $category) {
      id
      name
      price
      category
    }
  }
`;

const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;

const Products = () => {
  const { loading, error, data } = useQuery(PRODUCTS_QUERY, {
    pollInterval: 1000,
  });
  
  const { data: warehouseData } = useQuery(WAREHOUSES_QUERY);

  const [createProduct] = useMutation(CREATE_PRODUCT, {
    refetchQueries: [{ query: PRODUCTS_QUERY }],
  });
  const [updateProduct] = useMutation(UPDATE_PRODUCT);
  const [deleteProduct] = useMutation(DELETE_PRODUCT, {
    refetchQueries: [{ query: PRODUCTS_QUERY }],
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    price: '',
    initialStock: '',
    warehouseId: '',
  });

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      category: product.category,
      price: product.price,
      initialStock: '', // Not editable
      warehouseId: '', // Not editable
    });
    setIsModalOpen(true);
  };

  const getMainWarehouse = () => {
    if (!warehouseData?.warehouses) return null;
    // Prioritaskan WH-GUDANG-UTAMA sesuai request user
    return warehouseData.warehouses.find(w => w.code === 'WH-GUDANG-UTAMA') || 
           warehouseData.warehouses.find(w => w.code === 'WH-MAIN') || 
           warehouseData.warehouses[0];
  };

  const handleAdd = () => {
    setEditingProduct(null);
    const mainWarehouse = getMainWarehouse();
    setFormData({
      sku: '',
      name: '',
      category: '',
      price: '',
      initialStock: '0',
      warehouseId: mainWarehouse?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      try {
        await deleteProduct({ variables: { id } });
      } catch (e) {
        alert(e.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateProduct({
          variables: {
            id: editingProduct.id,
            name: formData.name,
            price: parseFloat(formData.price),
            category: formData.category,
          },
        });
      } else {
        await createProduct({
          variables: {
            sku: formData.sku,
            name: formData.name,
            category: formData.category,
            price: parseFloat(formData.price),
            initialStock: parseInt(formData.initialStock),
            warehouseId: formData.warehouseId,
          },
        });
      }
      setIsModalOpen(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const getMainStock = (product) => {
    if (!product.stocks) return 0;
    // Try to find stock in WH-MAIN first, otherwise sum all (fallback) or 0
    // Based on user request, we focus on "Gudang Utama"
    // We need to identify which stock entry belongs to WH-MAIN.
    // Ideally we match by code 'WH-MAIN' if available in the stock object (which we requested).
    
    const mainStock = product.stocks.find(s => s.warehouse.code === 'WH-GUDANG-UTAMA') || 
                      product.stocks.find(s => s.warehouse.code === 'WH-MAIN');
    if (mainStock) return mainStock.quantity;
    
    // Fallback: If no WH-MAIN defined yet in DB, maybe just show total? 
    // But user insists on "quantity decreases when transfer happens".
    // If we show Total, it won't decrease.
    // So we MUST show specific warehouse stock.
    // If WH-MAIN not found, show 0 or the first warehouse's stock?
    // Let's assume WH-MAIN is the standard.
    return 0;
  };

  const getTotalStock = (product) => {
    if (!product.stocks) return 0;
    return product.stocks.reduce((acc, s) => acc + s.quantity, 0);
  }

  if (loading) return <div>Memuat...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  const filteredProducts = data.products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Produk (Gudang Utama)</h2>
          <p className="text-sm text-gray-500">Mengelola stok di Gudang Utama (WH-GUDANG-UTAMA / WH-MAIN)</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Tambah Produk
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative rounded-md shadow-sm max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2"
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info Produk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <Package size={14} className="mr-1" />
                    Stok Utama
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Stok Sistem</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const mainStock = getMainStock(product);
                const totalStock = getTotalStock(product);
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                      {mainStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {totalStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-900 mr-4">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingProduct ? 'Ubah Produk' : 'Produk Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">SKU</label>
                <input
                  type="text"
                  required
                  disabled={!!editingProduct}
                  className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 ${editingProduct ? 'bg-gray-100' : ''}`}
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kategori</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Harga</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              
              {!editingProduct && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stok Awal (Gudang Utama)</label>
                    <input
                      type="number"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                      value={formData.initialStock}
                      onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                    />
                  </div>
                  {/* Warehouse selection hidden/disabled because user wants to force Main Warehouse */}
                  <div className="opacity-50 pointer-events-none">
                    <label className="block text-sm font-medium text-gray-700">Gudang</label>
                    <select
                      required
                      disabled
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-100"
                      value={formData.warehouseId}
                      onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    >
                      <option value="">Pilih Gudang</option>
                      {warehouseData?.warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name} {w.code === 'WH-MAIN' ? '(Default)' : ''}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Produk baru selalu ditambahkan ke Gudang Utama.</p>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingProduct ? 'Perbarui' : 'Buat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
