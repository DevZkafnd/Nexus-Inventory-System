import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Package, Warehouse, History, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

const DASHBOARD_QUERY = gql`
  query GetDashboardData {
    products {
      id
      name
      totalStock
      category
    }
    warehouses {
      id
      name
      code
      capacity
      stocks {
        quantity
        product { id }
      }
      staffs { id }
    }
    transactions(limit: 20) {
      id
      type
      quantity
      timestamp
    }
  }
`;

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
    <div className={`p-4 rounded-full ${color} mr-4`}>
      {React.createElement(icon, { size: 24, className: 'text-white' })}
    </div>
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Dashboard = () => {
  const { loading, error, data } = useQuery(DASHBOARD_QUERY, {
    pollInterval: 5000,
  });
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);

  const chartData = useMemo(() => {
    if (!data) return { categoryData: [], topProducts: [], activityData: [], warehouseStats: [], branches: [] };

    // 1. Category Distribution
    const categoryMap = data.products.reduce((acc, product) => {
      const cat = product.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + (product.totalStock || 0);
      return acc;
    }, {});
    
    const categoryData = Object.keys(categoryMap).map(key => ({
      name: key,
      value: categoryMap[key]
    }));

    // 2. Top 5 Products by Stock
    const topProducts = [...data.products]
      .sort((a, b) => b.totalStock - a.totalStock)
      .slice(0, 5)
      .map(p => ({
        name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
        fullName: p.name,
        stok: p.totalStock
      }));

    // 3. Activity Timeline (Mocked logic based on transactions if available, else usage of fetched transactions)
    // Group transactions by date
    const activityMap = {};
    const sortedTransactions = [...data.transactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    sortedTransactions.forEach(t => {
      const date = new Date(t.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (!activityMap[date]) {
        activityMap[date] = { date, inbound: 0, outbound: 0 };
      }
      if (t.type === 'INBOUND' || t.type === 'INITIAL_ADJUSTMENT') {
        activityMap[date].inbound += t.quantity;
      } else if (t.type === 'OUTBOUND' || t.type === 'TRANSFER') {
        activityMap[date].outbound += t.quantity;
      }
    });

    const activityData = Object.values(activityMap);

    const warehouseStats = (data.warehouses || []).map(w => {
      const used = (w.stocks || []).reduce((acc, s) => acc + (s.quantity || 0), 0);
      const productTypes = new Set((w.stocks || []).map(s => s.product?.id)).size;
      const staffCount = (w.staffs || []).length;
      return {
        id: w.id,
        name: w.name,
        capacity: w.capacity || 0,
        used,
        productTypes,
        staffCount,
      };
    });

    const branches = (data.warehouses || []).filter(w => w.code !== 'WH-GUDANG-UTAMA' && w.code !== 'WH-MAIN');

    return { categoryData, topProducts, activityData, warehouseStats, branches };
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const branchList = (data.warehouses || []).filter(w => w.code !== 'WH-GUDANG-UTAMA' && w.code !== 'WH-MAIN');
    if (branchList.length === 0) return;
    if (!selectedWarehouseId || !branchList.find(w => w.id === selectedWarehouseId)) {
      setSelectedWarehouseId(branchList[0].id);
    }
  }, [data, selectedWarehouseId]);

  if (loading) return <div className="p-4 flex items-center justify-center min-h-[400px]">Memuat data dasbor...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  const totalProducts = data.products.length;
  const totalWarehouses = data.warehouses.length;
  const totalStock = data.products.reduce((acc, product) => {
    return acc + (product.totalStock || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Top Products */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6 text-gray-800">Top 5 Produk Terbanyak</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.topProducts} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value, 'Stok']}
                  labelFormatter={(label, payload) => {
                    if (payload && payload.length > 0) return payload[0].payload.fullName;
                    return label;
                  }}
                />
                <Bar dataKey="stok" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Category Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6 text-gray-800">Distribusi Kategori</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
             {chartData.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Item']} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
             ) : (
               <div className="text-gray-400">Belum ada data kategori</div>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Kapasitas Gudang (Pie)</h3>
              <p className="text-xs text-gray-500">Lingkar abu-abu transparan = 100% kapasitas</p>
            </div>
            <div className="flex items-center">
              {chartData.branches.length > 0 ? (
                <select
                  value={selectedWarehouseId || ''}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                >
                  {chartData.branches.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-gray-400">Tidak ada gudang cabang</span>
              )}
            </div>
          </div>
          <div className="h-[280px] w-full flex items-center justify-center">
            {selectedWarehouseId ? (
              (() => {
                const stat = chartData.warehouseStats.find(ws => ws.id === selectedWarehouseId);
                const capacity = stat?.capacity || 0;
                const used = stat?.used || 0;
                const utilization = capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0;
                const backgroundData = [{ name: 'Capacity', value: 100 }];
                const foregroundData = [
                  { name: 'Terpakai', value: utilization },
                  { name: 'Sisa', value: 100 - utilization }
                ];
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={backgroundData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        dataKey="value"
                      >
                        <Cell fill="rgba(148,163,184,0.35)" />
                      </Pie>
                      <Pie
                        data={foregroundData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        labelLine={false}
                        label={({ value }) => `${value}%`}
                      >
                        <Cell fill="#06B6D4" />
                        <Cell fill="rgba(0,0,0,0)" />
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()
            ) : (
              <div className="text-gray-400">Pilih gudang cabang untuk melihat kapasitas</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6 text-gray-800">Jenis Produk per Gudang</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.warehouseStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 11}} interval={0} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="productTypes" name="Jenis Produk" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6 text-gray-800">Jumlah Staf per Gudang</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.warehouseStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 11}} interval={0} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="staffCount" name="Staf" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Area Chart - Activity Trend */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-6 text-gray-800">Aktivitas Stok (20 Transaksi Terakhir)</h3>
        <div className="h-[300px] w-full">
          {chartData.activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData.activityData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="inbound" name="Masuk (Inbound)" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                <Area type="monotone" dataKey="outbound" name="Keluar (Outbound)" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Belum ada aktivitas transaksi
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Aksi Cepat</h3>
        <p className="text-gray-500">Pilih modul dari sidebar untuk mengelola inventaris Anda.</p>
      </div>
    </div>
  );
};

export default Dashboard;