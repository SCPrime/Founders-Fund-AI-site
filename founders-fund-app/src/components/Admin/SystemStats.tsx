'use client';

/**
 * System Statistics Component
 *
 * Displays comprehensive system statistics for admin dashboard
 */

import { useEffect, useState } from 'react';

interface SystemStats {
  users: {
    total: number;
    byRole: {
      FOUNDER: number;
      INVESTOR: number;
      ADMIN: number;
    };
    recent: number;
  };
  portfolios: {
    total: number;
  };
  agents: {
    total: number;
    byStatus: {
      ACTIVE: number;
      PAUSED: number;
      CLOSED: number;
    };
    recent: number;
  };
  trades: {
    total: number;
    totalVolume: number;
    totalFees: number;
    recent: number;
  };
  reports: {
    total: number;
  };
  activity: {
    recentUsers: number;
    recentTrades: number;
    recentAgents: number;
  };
}

export default function SystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button onClick={fetchStats} className="mt-2 text-red-600 hover:text-red-800 underline">
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: string;
  }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-3xl text-gray-400">{icon}</div>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats.users.total}
            subtitle={`${stats.users.recent} new in last 7 days`}
            icon="👥"
          />
          <StatCard title="Portfolios" value={stats.portfolios.total} icon="📊" />
          <StatCard
            title="Trading Agents"
            value={stats.agents.total}
            subtitle={`${stats.agents.byStatus.ACTIVE} active`}
            icon="🤖"
          />
          <StatCard
            title="Total Trades"
            value={stats.trades.total}
            subtitle={`${stats.trades.recent} in last 7 days`}
            icon="📈"
          />
        </div>
      </div>

      {/* User Breakdown */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Founders" value={stats.users.byRole.FOUNDER} icon="👑" />
          <StatCard title="Investors" value={stats.users.byRole.INVESTOR} icon="💼" />
          <StatCard title="Admins" value={stats.users.byRole.ADMIN} icon="🔐" />
        </div>
      </div>

      {/* Agent Status */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Agent Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Active Agents" value={stats.agents.byStatus.ACTIVE} icon="✅" />
          <StatCard title="Paused Agents" value={stats.agents.byStatus.PAUSED} icon="⏸️" />
          <StatCard title="Closed Agents" value={stats.agents.byStatus.CLOSED} icon="🔒" />
        </div>
      </div>

      {/* Trading Statistics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Trading Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Volume"
            value={`$${stats.trades.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon="💰"
          />
          <StatCard
            title="Total Fees"
            value={`$${stats.trades.totalFees.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            icon="💵"
          />
          <StatCard title="Reports Generated" value={stats.reports.total} icon="📄" />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity (Last 7 Days)</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">New Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activity.recentUsers}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">New Trades</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activity.recentTrades}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">New Agents</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activity.recentAgents}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
