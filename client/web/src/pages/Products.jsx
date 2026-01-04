import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Plus, Edit, Trash2, X, Search, Package } from 'lucide-react';

const DEFAULT_CATEGORIES = ['makanan', 'minuman', 'skincare', 'household', 'elektronik'];

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
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    price: '',
    initialStock: '',
    warehouseId: '',
  });
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isCategoryPanelOpen, setIsCategoryPanelOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryOld, setEditCategoryOld] = useState('');
  const [editCategoryNew, setEditCategoryNew] = useState('');
  const [deleteCategoryName, setDeleteCategoryName] = useState('');
  const [deleteReassignTo, setDeleteReassignTo] = useState('uncategorized');

  const normalize = (v) => String(v || '').toLowerCase().trim();
  const displayName = (v) => {
    const s = String(v || '').toLowerCase().trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  };

  React.useEffect(() => {
    const stored = localStorage.getItem('product_categories');
    let base = DEFAULT_CATEGORIES.slice();
    if (stored) {
      let parsed = null;
      try {
        parsed = JSON.parse(stored);
      } catch {
        parsed = null;
      }
      if (Array.isArray(parsed)) {
        base = Array.from(new Set(parsed.map(normalize)));
      }
    }
    const derived = Array.from(new Set((data?.products || []).map(p => normalize(p.category)).filter(Boolean)));
    const merged = Array.from(new Set([...base, ...derived]));
    setCategories(merged);
  }, [data]);

  const persistCategories = (next) => {
    setCategories(next);
    localStorage.setItem('product_categories', JSON.stringify(next));
  };

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

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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

  const filteredProducts = data.products
    .filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(product => {
      if (categoryFilter === 'ALL') return true;
      return normalize(product.category) === normalize(categoryFilter);
    });
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative rounded-md shadow-sm max-w-md w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2"
                placeholder="Cari produk..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Kategori:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-2 bg-white"
              >
                <option value="ALL">Semua</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{displayName(c)}</option>
                ))}
              </select>
              <button
                onClick={() => setIsCategoryPanelOpen(v => !v)}
                className="ml-2 text-sm px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
              >
                Kelola Kategori
              </button>
            </div>
          </div>
        </div>
        
        {isCategoryPanelOpen && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-md border">
                <h4 className="font-semibold text-gray-800 mb-2">Daftar Kategori</h4>
                <div className="flex flex-wrap gap-2">
                  {categories.length > 0 ? categories.map(c => (
                    <span key={c} className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {displayName(c)}
                    </span>
                  )) : <span className="text-xs text-gray-400">Belum ada kategori</span>}
                </div>
              </div>
              <div className="bg-white p-4 rounded-md border">
                <h4 className="font-semibold text-gray-800 mb-2">Tambah Kategori</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 border rounded-md px-3 py-2"
                    placeholder="Nama kategori..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <button
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    onClick={() => {
                      const n = normalize(newCategoryName);
                      if (!n) return;
                      if (categories.includes(n)) return;
                      persistCategories([...categories, n]);
                      setNewCategoryName('');
                    }}
                  >
                    Tambah
                  </button>
                </div>
              </div>
              <div className="bg-white p-4 rounded-md border">
                <h4 className="font-semibold text-gray-800 mb-2">Ubah / Hapus Kategori</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded-md px-2 py-2"
                      value={editCategoryOld}
                      onChange={(e) => setEditCategoryOld(e.target.value)}
                    >
                      <option value="">Pilih kategori</option>
                      {categories.map(c => (
                        <option key={c} value={c}>{displayName(c)}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="flex-1 border rounded-md px-3 py-2"
                      placeholder="Nama baru..."
                      value={editCategoryNew}
                      onChange={(e) => setEditCategoryNew(e.target.value)}
                    />
                    <button
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      onClick={async () => {
                        const oldN = normalize(editCategoryOld);
                        const newN = normalize(editCategoryNew);
                        if (!oldN || !newN || oldN === newN) return;
                        const next = categories.map(c => c === oldN ? newN : c);
                        persistCategories(Array.from(new Set(next)));
                        const affected = (data?.products || []).filter(p => normalize(p.category) === oldN);
                        for (const p of affected) {
                          try {
                            await updateProduct({ variables: { id: p.id, category: displayName(newN) } });
                          } catch (e) {
                            // swallow for now
                          }
                        }
                        setEditCategoryOld('');
                        setEditCategoryNew('');
                      }}
                    >
                      Ubah Nama
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded-md px-2 py-2"
                      value={deleteCategoryName}
                      onChange={(e) => setDeleteCategoryName(e.target.value)}
                    >
                      <option value="">Pilih kategori</option>
                      {categories.map(c => (
                        <option key={c} value={c}>{displayName(c)}</option>
                      ))}
                    </select>
                    <select
                      className="border rounded-md px-2 py-2"
                      value={deleteReassignTo}
                      onChange={(e) => setDeleteReassignTo(e.target.value)}
                    >
                      <option value="uncategorized">Uncategorized</option>
                      {categories.map(c => (
                        <option key={c} value={c}>{displayName(c)}</option>
                      ))}
                    </select>
                    <button
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      onClick={async () => {
                        const del = normalize(deleteCategoryName);
                        if (!del) return;
                        const reass = normalize(deleteReassignTo);
                        const next = categories.filter(c => c !== del);
                        persistCategories(next);
                        const affected = (data?.products || []).filter(p => normalize(p.category) === del);
                        for (const p of affected) {
                          try {
                            await updateProduct({ variables: { id: p.id, category: displayName(reass) } });
                          } catch (e) {
                            // swallow for now
                          }
                        }
                        setDeleteCategoryName('');
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
              {currentItems.map((product) => {
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

      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === 1 ? 'text-gray-300 bg-gray-100 cursor-not-allowed' : 'text-gray-700 bg-white hover:bg-gray-50'}`}
          >
            Previous
          </button>
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === totalPages ? 'text-gray-300 bg-gray-100 cursor-not-allowed' : 'text-gray-700 bg-white hover:bg-gray-50'}`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Menampilkan <span className="font-medium">{filteredProducts.length > 0 ? indexOfFirstItem + 1 : 0}</span> sampai <span className="font-medium">{Math.min(indexOfLastItem, filteredProducts.length)}</span> dari <span className="font-medium">{filteredProducts.length}</span> hasil
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <span className="sr-only">Previous</span>
                {/* Left arrow icon omitted to keep consistent minimal UI */}
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => paginate(pageNum)}
                    aria-current={currentPage === pageNum ? 'page' : undefined}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNum ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <span className="sr-only">Next</span>
                {/* Right arrow icon omitted to keep consistent minimal UI */}
              </button>
            </nav>
          </div>
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
                <select
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{displayName(c)}</option>
                  ))}
                </select>
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