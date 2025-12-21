import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Warehouse, History, Menu, X, Users, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const { logout } = useAuth();

  const navigation = [
    { name: 'Dasbor', href: '/', icon: LayoutDashboard },
    { name: 'Produk', href: '/products', icon: Package },
    { name: 'Gudang', href: '/warehouses', icon: Warehouse },
    { name: 'Riwayat Transaksi', href: '/transactions', icon: History },
    { name: 'Pengguna', href: '/users', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`bg-gray-900 text-white ${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center justify-between">
          <h1 className={`font-bold text-xl ${!isSidebarOpen && 'hidden'}`}>Nexus Admin</h1>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-800 rounded">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className="flex-1 mt-6">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 text-sm transition-colors ${
                  isActive ? 'bg-gray-800 text-white border-l-4 border-blue-500' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon size={20} className="mr-3" />
                {isSidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
           <button
             onClick={logout}
             className="flex items-center px-4 py-3 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 w-full transition-colors"
           >
             <LogOut size={20} className="mr-3" />
             {isSidebarOpen && <span>Keluar</span>}
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow p-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {navigation.find(item => item.href === location.pathname)?.name || 'Dasbor'}
          </h2>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
