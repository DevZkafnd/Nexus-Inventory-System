import React from 'react';
import { useQuery, gql } from '@apollo/client';
import { Package, Warehouse, History, TrendingUp } from 'lucide-react';

const DASHBOARD_QUERY = gql`
  query GetDashboardData {
    products {
      id
      totalStock
    }
    warehouses {
      id
    }
  }
`;

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
    <div className={`p-4 rounded-full ${color} mr-4`}>
      <Icon size={24} className="text-white" />
    </div>
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
);

const Dashboard = () => {
  const { loading, error, data } = useQuery(DASHBOARD_QUERY, {
    pollInterval: 1000,
  });

  if (loading) return <div className="p-4">Memuat data dasbor...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  const totalProducts = data.products.length;
  const totalWarehouses = data.warehouses.length;
  const totalStock = data.products.reduce((acc, product) => {
    return acc + (product.totalStock || 0);
  }, 0);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total Produk" 
          value={totalProducts} 
          icon={Package} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Total Gudang" 
          value={totalWarehouses} 
          icon={Warehouse} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Total Stok Item" 
          value={totalStock} 
          icon={TrendingUp} 
          color="bg-purple-500" 
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Aksi Cepat</h3>
        <p className="text-gray-500">Pilih modul dari sidebar untuk mengelola inventaris Anda.</p>
      </div>
    </div>
  );
};

export default Dashboard;
