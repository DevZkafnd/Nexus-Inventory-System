import React from 'react';
import { useQuery, gql } from '@apollo/client';
import { User, Shield, Warehouse } from 'lucide-react';

const USERS_QUERY = gql`
  query GetUsers {
    users {
      id
      name
      email
      role
      warehouses {
        id
        name
      }
    }
  }
`;

const UsersPage = () => {
  const { loading, error, data } = useQuery(USERS_QUERY, {
    pollInterval: 1000,
  });

  if (loading) return <div>Memuat...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Manajemen Pengguna</h2>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pengguna</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peran</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gudang Ditugaskan</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User size={20} className="text-gray-500" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <Shield size={16} className="mr-2 text-gray-400" />
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {user.warehouses && user.warehouses.length > 0 ? (
                    user.warehouses.map((warehouse, idx) => (
                      <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Warehouse size={12} className="mr-1" />
                        {warehouse.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400 italic">Tidak ada penugasan</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersPage;
