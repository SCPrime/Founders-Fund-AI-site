'use client';

import { useEffect, useState } from 'react';

interface SystemStats {
  users: {
    total: number;
    byRole: {
      FOUNDER: number;
      INVESTOR: number;
      ADMIN: number;
    };
  };
  portfolios: {
    total: number;
    totalValue: number;
  };
  agents: {
    total: number;
    byStatus: {
      ACTIVE: number;
      PAUSED: number;
      CLOSED: number;
    };
    totalAllocation: number;
  };
  trades: {
    total: number;
    totalVolume: number;
    totalFees: number;
  };
  reports: {
    total: number;
    totalDownloads: number;
  };
  scans: {
    total: number;
  };
  recentActivity: {
    last24Hours: {
      newUsers: number;
      newPortfolios: number;
      newAgents: number;
      newTrades: number;
    };
  };
}

export default function SystemStatsPanel() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
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
    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {icon && <div className="text-4xl text-gray-400">{icon}</div>}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">System Overview</h2>
        <p className="text-sm text-gray-500 mt-1">
          Last updated: {new Date(stats.timestamp || Date.now()).toLocaleString()}
        </p>
      </div>

      {/* Users Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Users</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={stats.users.total} icon="👥" />
          <StatCard title="Founders" value={stats.users.byRole.FOUNDER} />
          <StatCard title="Investors" value={stats.users.byRole.INVESTOR} />
          <StatCard title="Admins" value={stats.users.byRole.ADMIN} />
        </div>
      </div>

      {/* Portfolios & Agents Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolios & Agents</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Portfolios"
            value={stats.portfolios.total}
            subtitle={`$${stats.portfolios.totalValue.toLocaleString()} total value`}
            icon="📊"
          />
          <StatCard
            title="Total Agents"
            value={stats.agents.total}
            subtitle={`$${stats.agents.totalAllocation.toLocaleString()} allocated`}
            icon="🤖"
          />
          <StatCard
            title="Active Agents"
            value={stats.agents.byStatus.ACTIVE}
            subtitle={`${stats.agents.byStatus.PAUSED} paused, ${stats.agents.byStatus.CLOSED} closed`}
          />
        </div>
      </div>

      {/* Trading Activity Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Trading Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Trades" value={stats.trades.total} icon="💹" />
          <StatCard title="Total Volume" value={`$${stats.trades.totalVolume.toLocaleString()}`} />
          <StatCard title="Total Fees" value={`$${stats.trades.totalFees.toLocaleString()}`} />
        </div>
      </div>

      {/* Reports & Scans Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Reports & Scans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Reports"
            value={stats.reports.total}
            subtitle={`${stats.reports.totalDownloads} downloads`}
            icon="📄"
          />
          <StatCard title="Total Scans" value={stats.scans.total} icon="🔍" />
        </div>
      </div>

      {/* Recent Activity (24h) */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity (Last 24 Hours)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="New Users" value={stats.recentActivity.last24Hours.newUsers} icon="✨" />
          <StatCard title="New Portfolios" value={stats.recentActivity.last24Hours.newPortfolios} />
          <StatCard title="New Agents" value={stats.recentActivity.last24Hours.newAgents} />
          <StatCard title="New Trades" value={stats.recentActivity.last24Hours.newTrades} />
        </div>
      </div>
    </div>
  );
}
