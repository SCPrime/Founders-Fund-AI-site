'use client';

import { AlertCondition, getPriceAlertManager, PriceAlert } from '@/lib/priceAlerts';
import React, { useEffect, useState } from 'react';

interface PriceAlertManagerProps {
  userId: string;
  portfolioId?: string;
  agentId?: string;
  symbol?: string;
  chain?: string;
  address?: string;
}

export default function PriceAlertManager({
  userId,
  portfolioId,
  agentId,
  symbol,
  chain,
  address,
}: PriceAlertManagerProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formSymbol, setFormSymbol] = useState(symbol || '');
  const [formChain, setFormChain] = useState(chain || 'solana');
  const [formAddress, setFormAddress] = useState(address || '');
  const [formCondition, setFormCondition] = useState<AlertCondition>('ABOVE');
  const [formThreshold, setFormThreshold] = useState('');
  const [formMessage, setFormMessage] = useState('');

  const alertManager = getPriceAlertManager();

  useEffect(() => {
    loadAlerts();

    // Listen for alert triggers
    interface AlertEvent {
      alert: {
        message?: string;
      };
    }

    const handleAlertTriggered = (event: AlertEvent) => {
      alert(`Price Alert Triggered!\n${event.alert.message || 'Alert condition met'}`);
      loadAlerts(); // Refresh list
    };

    alertManager.on('alertTriggered', handleAlertTriggered);

    return () => {
      alertManager.off('alertTriggered', handleAlertTriggered);
    };
  }, [userId, portfolioId, agentId]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId });
      if (portfolioId) params.append('portfolioId', portfolioId);
      if (agentId) params.append('agentId', agentId);

      const response = await fetch(`/api/alerts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts);

        // Load alerts into manager
        await alertManager.loadAlerts(userId);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          portfolioId,
          agentId,
          symbol: formSymbol,
          chain: formChain,
          address: formAddress,
          condition: formCondition,
          threshold: parseFloat(formThreshold),
          message: formMessage || undefined,
        }),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setFormSymbol(symbol || '');
        setFormChain(chain || 'solana');
        setFormAddress(address || '');
        setFormCondition('ABOVE');
        setFormThreshold('');
        setFormMessage('');
        await loadAlerts();
      } else {
        const error = await response.json();
        alert(`Failed to create alert: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to create alert:', error);
      alert('Failed to create alert');
    }
  };

  const handleToggleAlert = async (alertId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        await loadAlerts();
      }
    } catch (error) {
      console.error('Failed to toggle alert:', error);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadAlerts();
      }
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'ABOVE':
        return 'Price Above';
      case 'BELOW':
        return 'Price Below';
      case 'CHANGE_UP':
        return 'Price Up By';
      case 'CHANGE_DOWN':
        return 'Price Down By';
      default:
        return condition;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'ABOVE':
      case 'CHANGE_UP':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'BELOW':
      case 'CHANGE_DOWN':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Price Alerts</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          {showCreateForm ? 'Cancel' : '+ Create Alert'}
        </button>
      </div>

      {/* Create Alert Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateAlert}
          className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50"
        >
          <h3 className="text-lg font-semibold mb-4">Create New Alert</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
              <input
                type="text"
                value={formSymbol}
                onChange={(e) => setFormSymbol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={Boolean(symbol)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chain</label>
              <select
                value={formChain}
                onChange={(e) => setFormChain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={Boolean(chain)}
              >
                <option value="solana">Solana</option>
                <option value="ethereum">Ethereum</option>
                <option value="bsc">BSC</option>
                <option value="polygon">Polygon</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Token Address</label>
              <input
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={Boolean(address)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <select
                value={formCondition}
                onChange={(e) => setFormCondition(e.target.value as AlertCondition)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ABOVE">Price Above</option>
                <option value="BELOW">Price Below</option>
                <option value="CHANGE_UP">Price Increases By %</option>
                <option value="CHANGE_DOWN">Price Decreases By %</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Threshold {formCondition.includes('CHANGE') ? '(%)' : '($)'}
              </label>
              <input
                type="number"
                step="any"
                value={formThreshold}
                onChange={(e) => setFormThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Message (Optional)
              </label>
              <input
                type="text"
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Alert message..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            Create Alert
          </button>
        </form>
      )}

      {/* Alerts List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-gray-500 mt-2">Loading alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No alerts created yet. Click &quot;Create Alert&quot; to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 border rounded-lg ${
                alert.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-semibold text-gray-900">{alert.symbol}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getConditionColor(alert.condition)}`}
                    >
                      {getConditionLabel(alert.condition)}
                    </span>
                    {alert.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-1">
                    {getConditionLabel(alert.condition)}:{' '}
                    <span className="font-semibold">
                      {alert.condition.includes('CHANGE')
                        ? `${alert.threshold}%`
                        : `$${alert.threshold}`}
                    </span>
                  </p>

                  {alert.message && <p className="text-sm text-gray-500 italic">{alert.message}</p>}

                  <p className="text-xs text-gray-400 mt-2">
                    Created: {new Date(alert.createdAt!).toLocaleString()}
                    {alert.triggeredAt && (
                      <> • Triggered: {new Date(alert.triggeredAt).toLocaleString()}</>
                    )}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleToggleAlert(alert.id!, alert.isActive)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      alert.isActive
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {alert.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteAlert(alert.id!)}
                    className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
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
