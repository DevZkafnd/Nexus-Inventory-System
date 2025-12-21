import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Plus, Edit, Trash2, X, Package, Users, MapPin, QrCode, Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

const WAREHOUSES_QUERY = gql`
  query GetWarehouses {
    warehouses {
      id
      name
      location
      code
      capacity
      stocks {
        quantity
        product {
          id
          name
          sku
          category
        }
      }
      staffs {
        id
        name
        email
        role
      }
    }
  }
`;

const CREATE_WAREHOUSE = gql`
  mutation CreateWarehouse($name: String!, $location: String!, $code: String!, $capacity: Int) {
    createWarehouse(name: $name, location: $location, code: $code, capacity: $capacity) {
      id
      name
      location
      code
      capacity
    }
  }
`;

const UPDATE_WAREHOUSE = gql`
  mutation UpdateWarehouse($id: ID!, $name: String, $location: String, $code: String, $capacity: Int) {
    updateWarehouse(id: $id, name: $name, location: $location, code: $code, capacity: $capacity) {
      id
      name
      location
      code
      capacity
    }
  }
`;

const DELETE_WAREHOUSE = gql`
  mutation DeleteWarehouse($id: ID!) {
    deleteWarehouse(id: $id)
  }
`;

const Warehouses = () => {
  const { loading, error, data } = useQuery(WAREHOUSES_QUERY, {
    pollInterval: 1000,
  });

  const [createWarehouse] = useMutation(CREATE_WAREHOUSE, {
    refetchQueries: [{ query: WAREHOUSES_QUERY }],
  });
  const [updateWarehouse] = useMutation(UPDATE_WAREHOUSE);
  const [deleteWarehouse] = useMutation(DELETE_WAREHOUSE, {
    refetchQueries: [{ query: WAREHOUSES_QUERY }],
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [formData, setFormData] = useState({ name: '', location: '', code: '', capacity: '' });

  const handleEdit = (e, warehouse) => {
    e?.stopPropagation(); // Prevent opening detail modal if triggered from card
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      location: warehouse.location,
      code: warehouse.code,
      capacity: warehouse.capacity || '',
    });
    setIsModalOpen(true);
    setIsDetailModalOpen(false); // Close detail modal if open
  };

  const handleAdd = () => {
    setEditingWarehouse(null);
    setFormData({ name: '', location: '', code: '', capacity: '' });
    setIsModalOpen(true);
  };

  const handleDelete = async (e, id) => {
    e?.stopPropagation(); // Prevent opening detail modal if triggered from card
    if (window.confirm('Apakah Anda yakin ingin menghapus gudang ini?')) {
      try {
        await deleteWarehouse({ variables: { id } });
        setIsDetailModalOpen(false); // Close detail modal if open
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById('warehouse-qr');
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      // Gunakan nama warehouse untuk nama file
      const fileName = selectedWarehouse.name.replace(/\s+/g, '_').toLowerCase(); 
      downloadLink.download = `${fileName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handleCardClick = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsDetailModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const variables = {
      ...formData,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
    };

    try {
      if (editingWarehouse) {
        await updateWarehouse({ variables: { id: editingWarehouse.id, ...variables } });
      } else {
        await createWarehouse({ variables });
      }
      setIsModalOpen(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const calculateUsage = (warehouse) => {
    if (!warehouse.stocks) return 0;
    return warehouse.stocks.reduce((acc, stock) => acc + stock.quantity, 0);
  };

  const calculatePercentage = (usage, capacity) => {
    if (!capacity) return 0;
    const pct = (usage / capacity) * 100;
    return Math.min(pct, 100); // Cap at 100%
  };

  if (loading) return <div>Memuat...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gudang</h2>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Tambah Gudang
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.warehouses.map((warehouse) => {
          const usage = calculateUsage(warehouse);
          const capacity = warehouse.capacity || 0;
          const percentage = calculatePercentage(usage, capacity);
          const isFull = capacity > 0 && usage >= capacity;

          return (
            <div 
              key={warehouse.id} 
              onClick={() => handleCardClick(warehouse)}
              className="bg-white rounded-lg shadow p-6 border border-gray-100 relative group cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{warehouse.name}</h3>
                  <p className="text-sm text-gray-500">{warehouse.code}</p>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center">
                  <MapPin size={10} className="mr-1" />
                  {warehouse.location}
                </span>
              </div>
              
              <div className="mt-4">
                 <div className="flex justify-between text-sm text-gray-600 mb-1">
                   <span>Penggunaan Kapasitas</span>
                   <span className={isFull ? "text-red-600 font-bold" : ""}>
                     {usage} / {capacity || '∞'}
                   </span>
                 </div>
                 <div className="w-full bg-gray-200 rounded-full h-2.5">
                   <div 
                      className={`h-2.5 rounded-full ${isFull ? 'bg-red-500' : 'bg-blue-600'}`} 
                      style={{ width: `${capacity ? percentage : 0}%` }}
                   ></div>
                 </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-500 border-t pt-3">
                <div className="flex items-center">
                  <Package size={14} className="mr-1" />
                  {warehouse.stocks ? warehouse.stocks.length : 0} Jenis Produk
                </div>
                <div className="flex items-center">
                  <Users size={14} className="mr-1" />
                  {warehouse.staffs ? warehouse.staffs.length : 0} Staf
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingWarehouse ? 'Ubah Gudang' : 'Gudang Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700">Kode</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Lokasi</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kapasitas</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
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
                  {editingWarehouse ? 'Perbarui' : 'Buat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedWarehouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedWarehouse.name}</h3>
                <div className="flex items-center text-gray-500 mt-1">
                  <MapPin size={16} className="mr-1" />
                  {selectedWarehouse.location}
                  <span className="mx-2">•</span>
                  Kode: {selectedWarehouse.code}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={(e) => handleEdit(e, selectedWarehouse)} 
                  className="flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
                >
                  <Edit size={16} className="mr-1.5" />
                  Ubah
                </button>
                <button 
                  onClick={(e) => handleDelete(e, selectedWarehouse.id)} 
                  className="flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                  <Trash2 size={16} className="mr-1.5" />
                  Hapus
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={28} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Product List */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Package size={20} className="mr-2" />
                  Stok Inventaris
                </h4>
                {selectedWarehouse.stocks && selectedWarehouse.stocks.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg overflow-hidden border">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Jml</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedWarehouse.stocks.map((stock, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              <div className="font-medium">{stock.product.name}</div>
                              <div className="text-xs text-gray-500">{stock.product.sku}</div>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right font-mono">
                              {stock.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 italic p-4 bg-gray-50 rounded-lg text-center">Tidak ada stok produk.</p>
                )}
              </div>

              {/* Staff List & QR Code */}
              <div className="flex flex-col space-y-8">
                {/* Staff List */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Users size={20} className="mr-2" />
                    Staf Ditugaskan
                  </h4>
                  {selectedWarehouse.staffs && selectedWarehouse.staffs.length > 0 ? (
                    <div className="space-y-3">
                      {selectedWarehouse.staffs.map((staff) => (
                        <div key={staff.id} className="flex items-center p-3 bg-white border rounded-lg shadow-sm">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                            {staff.name ? staff.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{staff.name || 'Tanpa Nama'}</div>
                            <div className="text-xs text-gray-500">{staff.email}</div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 mt-1 inline-block">
                              {staff.role}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic p-4 bg-gray-50 rounded-lg text-center">Tidak ada staf ditugaskan.</p>
                  )}
                </div>

                {/* Activation QR Code */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col items-center">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <QrCode size={20} className="mr-2" />
                    QR Aktivasi Staf
                  </h4>
                  <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                    <QRCodeCanvas
                      id="warehouse-qr"
                      value={`ASSIGN_WAREHOUSE::${selectedWarehouse.id}`}
                      size={200}
                      level={"H"}
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-sm text-gray-500 text-center mb-4 max-w-xs">
                    Pindai kode QR ini dengan aplikasi seluler untuk mengaktifkan staf pada <strong>{selectedWarehouse.name}</strong>.
                  </p>
                  <button
                    onClick={downloadQR}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Download size={18} className="mr-2" />
                    Unduh Kode QR
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
