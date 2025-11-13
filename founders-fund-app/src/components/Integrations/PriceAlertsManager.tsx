'use client';

import React, { useEffect, useState } from 'react';

export interface PriceAlert {
  id: string;
  userId: string;
  portfolioId?: string;
  agentId?: string;
  symbol: string;
  chain: string;
  address: string;
  condition: 'ABOVE' | 'BELOW' | 'CHANGE_UP' | 'CHANGE_DOWN';
  threshold: number;
  isActive: boolean;
  message?: string;
  createdAt: string;
  triggeredAt?: string;
}

interface PriceAlertsManagerProps {
  userId: string;
  portfolioId?: string;
  agentId?: string;
  className?: string;
}

export default function PriceAlertsManager({
  userId,
  portfolioId,
  agentId,
  className = '',
}: PriceAlertsManagerProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    chain: 'ethereum',
    address: '',
    condition: 'ABOVE' as PriceAlert['condition'],
    threshold: 0,
    message: '',
  });

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ userId });
      if (portfolioId) params.append('portfolioId', portfolioId);
      if (agentId) params.append('agentId', agentId);

      const response = await fetch(`/api/alerts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [userId, portfolioId, agentId]);

  // Create alert
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId,
          portfolioId: portfolioId || undefined,
          agentId: agentId || undefined,
        }),
      });

      if (response.ok) {
        await fetchAlerts();
        setShowCreateForm(false);
        setFormData({
          symbol: '',
          chain: 'ethereum',
          address: '',
          condition: 'ABOVE',
          threshold: 0,
          message: '',
        });
      }
    } catch (error) {
      console.error('Failed to create alert:', error);
      alert('Failed to create alert');
    }
  };

  // Toggle alert active status
  const handleToggle = async (alertId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to update alert:', error);
    }
  };

  // Delete alert
  const handleDelete = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const getConditionLabel = (condition: PriceAlert['condition']) => {
    switch (condition) {
      case 'ABOVE':
        return 'Price Above';
      case 'BELOW':
        return 'Price Below';
      case 'CHANGE_UP':
        return 'Price Up By';
      case 'CHANGE_DOWN':
        return 'Price Down By';
    }
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Price Alerts</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          {showCreateForm ? 'Cancel' : '+ New Alert'}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Symbol
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                placeholder="PEPE"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chain
              </label>
              <select
                value={formData.chain}
                onChange={(e) => setFormData({ ...formData, chain: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                title="Select blockchain network"
              >
                <option value="ethereum">Ethereum</option>
                <option value="solana">Solana</option>
                <option value="bsc">BSC</option>
                <option value="polygon">Polygon</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Token Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 font-mono"
              placeholder="0x..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) =>
                  setFormData({ ...formData, condition: e.target.value as PriceAlert['condition'] })
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                title="Select alert condition"
              >
                <option value="ABOVE">Price Above</option>
                <option value="BELOW">Price Below</option>
                <option value="CHANGE_UP">Price Up By %</option>
                <option value="CHANGE_DOWN">Price Down By %</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Threshold {formData.condition.includes('CHANGE') ? '(%)' : '($)'}
              </label>
              <input
                type="number"
                step="any"
                value={formData.threshold}
                onChange={(e) =>
                  setFormData({ ...formData, threshold: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message (Optional)
            </label>
            <input
              type="text"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              placeholder="Custom alert message"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Create Alert
          </button>
        </form>
      )}

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No alerts configured</p>
          <p className="text-sm mt-1">Create an alert to get notified when prices change</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-md border ${
                alert.isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {alert.symbol}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        alert.isActive
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {alert.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {alert.triggeredAt && (
                      <span className="text-xs text-orange-600 dark:text-orange-400">
                        Triggered
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getConditionLabel(alert.condition)}: {alert.threshold}
                    {alert.condition.includes('CHANGE') ? '%' : '$'}
                  </p>
                  {alert.message && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{alert.message}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Created: {new Date(alert.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(alert.id, alert.isActive)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      alert.isActive
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200'
                        : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200'
                    }`}
                  >
                    {alert.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
