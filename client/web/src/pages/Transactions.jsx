import React from 'react';
import { useQuery, gql } from '@apollo/client';

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
  const { loading, error, data } = useQuery(TRANSACTIONS_QUERY, {
    pollInterval: 1000,
  });

  if (loading) return <div>Memuat...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dari</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ke</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.transactions.map((tx) => (
            <tr key={tx.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(tx.timestamp).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  tx.type === 'INBOUND' ? 'bg-green-100 text-green-800' :
                  tx.type === 'OUTBOUND' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {tx.type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tx.product?.name || 'Tidak Diketahui'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tx.quantity}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.sourceWarehouse?.name || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.targetWarehouse?.name || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.referenceNote}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Transactions;
