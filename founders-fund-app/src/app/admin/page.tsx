'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'FOUNDER' | 'INVESTOR';
  createdAt: string;
  updatedAt: string;
  portfolioCount: number;
  messageCount: number;
}

interface SystemStats {
  users: {
    total: number;
    byRole: {
      ADMIN: number;
      FOUNDER: number;
      INVESTOR: number;
    };
  };
  portfolios: {
    total: number;
    totalValue: number;
  };
  agents: {
    total: number;
    active: number;
    totalValue: number;
    totalPnl: number;
  };
  activity: {
    totalTrades: number;
    totalScans: number;
    totalReports: number;
  };
  recentActivity: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    portfolioCount: number;
    lastActive: string;
  }>;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load users
      const userParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (searchTerm) userParams.append('search', searchTerm);
      if (roleFilter) userParams.append('role', roleFilter);

      const [usersRes, statsRes] = await Promise.all([
        fetch(`/api/admin/users?${userParams}`),
        fetch('/api/admin/stats'),
      ]);

      if (!usersRes.ok || !statsRes.ok) {
        throw new Error('Failed to load admin data');
      }

      const usersData = await usersRes.json();
      const statsData = await statsRes.json();

      setUsers(usersData.users);
      setTotalPages(usersData.pagination.totalPages);
      setStats(statsData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, roleFilter]);

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    loadData();
  }, [session, status, router, loadData]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update role');
        return;
      }

      // Reload data
      loadData();
    } catch {
      alert('Failed to update role');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
        return;
      }

      // Reload data
      loadData();
    } catch {
      alert('Failed to delete user');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading admin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <Link href="/" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">
              Back to Home
            </Link>
          </div>
          <p className="text-gray-600">System administration and user management</p>
        </div>

        {/* System Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
              <p className="text-3xl font-bold">{stats.users.total}</p>
              <div className="mt-2 text-sm text-gray-600">
                <span>Admin: {stats.users.byRole.ADMIN}</span>
                <span className="mx-2">•</span>
                <span>Founder: {stats.users.byRole.FOUNDER}</span>
                <span className="mx-2">•</span>
                <span>Investor: {stats.users.byRole.INVESTOR}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Portfolios</h3>
              <p className="text-3xl font-bold">{stats.portfolios.total}</p>
              <p className="mt-2 text-sm text-gray-600">
                Total Value: ${stats.portfolios.totalValue.toLocaleString()}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Trading Agents</h3>
              <p className="text-3xl font-bold">{stats.agents.active}</p>
              <p className="mt-2 text-sm text-gray-600">
                Total: {stats.agents.total} • P&L: ${stats.agents.totalPnl.toLocaleString()}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Activity</h3>
              <p className="text-3xl font-bold">{stats.activity.totalTrades}</p>
              <p className="mt-2 text-sm text-gray-600">
                Trades • {stats.activity.totalScans} Scans • {stats.activity.totalReports} Reports
              </p>
            </div>
          </div>
        )}

        {/* User Management */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">User Management</h2>
          </div>

          {/* Filters */}
          <div className="p-6 border-b bg-gray-50">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="flex-1 px-4 py-2 border rounded"
              />
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border rounded"
                title="Filter by user role"
                aria-label="Filter by user role"
              >
                <option value="">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="FOUNDER">Founder</option>
                <option value="INVESTOR">Investor</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Portfolios
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                        title={`Change role for ${user.name}`}
                        aria-label={`Change role for ${user.name}`}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="FOUNDER">Founder</option>
                        <option value="INVESTOR">Investor</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.portfolioCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        disabled={user.role === 'ADMIN' && session?.user.id === user.id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-6 border-t flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {stats && stats.recentActivity.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b"
                  >
                    <div>
                      <p className="font-medium">{activity.name}</p>
                      <p className="text-sm text-gray-600">{activity.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{activity.role}</p>
                      <p className="text-xs text-gray-500">
                        {activity.portfolioCount} portfolios •{' '}
                        {new Date(activity.lastActive).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
