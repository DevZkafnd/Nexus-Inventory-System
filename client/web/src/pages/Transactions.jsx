import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Search, Calendar, Clock, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';

const TRANSACTIONS_QUERY = gql`
  query GetTransactions {
    transactions {
      id
      type
      quantity
      timestamp
      referenceNote
      product {
        name
        sku
      }
      sourceWarehouse {
        name
      }
      targetWarehouse {
        name
      }
    }
  }
`;

const Transactions = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const itemsPerPage = 10;

  const { loading, error, data } = useQuery(TRANSACTIONS_QUERY, {
    pollInterval: 1000,
  });

  if (loading) return <div>Memuat...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  const transactions = data.transactions || [];

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.referenceNote?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = filterDate === '' || new Date(tx.timestamp).toISOString().split('T')[0] === filterDate;

    return matchesSearch && matchesDate;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDateFilter = (e) => {
    setFilterDate(e.target.value);
    setCurrentPage(1);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }).replace(':', '.');
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
        <h2 className="text-lg font-medium text-gray-900">Riwayat Transaksi</h2>
        <div className="flex space-x-2 w-full sm:w-auto">
          <div className="relative">
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-500"
              value={filterDate}
              onChange={handleDateFilter}
            />
          </div>
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Cari transaksi..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu Transaksi</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detail Perpindahan</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentItems.map((tx) => (
            <tr key={tx.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="flex items-center text-sm font-medium text-gray-900">
                    <Calendar size={14} className="mr-1.5 text-gray-500" />
                    {formatDate(tx.timestamp)}
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Clock size={14} className="mr-1.5 text-gray-400" />
                    {formatTime(tx.timestamp)}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  tx.type === 'INBOUND' ? 'bg-green-100 text-green-800' :
                  tx.type === 'OUTBOUND' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {tx.type === 'INBOUND' && <ArrowDownLeft size={14} className="mr-1" />}
                  {tx.type === 'OUTBOUND' && <ArrowUpRight size={14} className="mr-1" />}
                  {tx.type === 'TRANSFER' && <ArrowLeftRight size={14} className="mr-1" />}
                  {tx.type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{tx.product?.name || 'Tidak Diketahui'}</div>
                <div className="text-xs text-gray-500">SKU: {tx.product?.sku || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {tx.quantity} Unit
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex flex-col space-y-1">
                  {tx.sourceWarehouse && (
                    <div className="flex items-center">
                      <span className="text-xs text-gray-400 w-8">Dari:</span>
                      <span className="font-medium text-gray-700">{tx.sourceWarehouse.name}</span>
                    </div>
                  )}
                  {tx.targetWarehouse && (
                    <div className="flex items-center">
                      <span className="text-xs text-gray-400 w-8">Ke:</span>
                      <span className="font-medium text-gray-700">{tx.targetWarehouse.name}</span>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">
                {tx.referenceNote || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
              Menampilkan <span className="font-medium">{filteredTransactions.length > 0 ? indexOfFirstItem + 1 : 0}</span> sampai <span className="font-medium">{Math.min(indexOfLastItem, filteredTransactions.length)}</span> dari <span className="font-medium">{filteredTransactions.length}</span> hasil
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
                <ChevronLeft size={20} />
              </button>
              
              {/* Logic for pagination numbers could be complex for many pages, simplifying to show current context or limited range if needed, but standard full list is ok for small datasets. For large, maybe just show prev/next and current. */}
              {/* Showing a simplified version to avoid clutter if many pages */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                 // Logic to center current page if possible, or just show first 5 for now as simple implementation
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
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === pageNum
                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
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
                <ChevronRight size={20} />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;