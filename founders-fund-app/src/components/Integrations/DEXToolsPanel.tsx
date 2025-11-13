'use client';

import { useEffect, useState } from 'react';

interface DEXToolsPanelProps {
  chain: string;
  address: string;
  theme?: 'light' | 'dark';
}

interface HolderData {
  chain: string;
  address: string;
  totalHolders: number;
  holders: Array<{
    address: string;
    balance: string;
    percentage: number;
    isContract: boolean;
    tag: string | null;
  }>;
  distribution: {
    top10Percentage: number;
    top50Percentage: number;
    top100Percentage: number;
  };
}

/**
 * DEXTools Panel - Token holder analysis and distribution
 *
 * @param chain - Blockchain network (e.g., 'ether', 'bsc', 'polygon')
 * @param address - Token contract address
 * @param theme - Display theme (light or dark)
 */
export default function DEXToolsPanel({
  chain,
  address,
  theme = 'dark',
}: DEXToolsPanelProps) {
  const [holderData, setHolderData] = useState<HolderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHolderData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/integrations/dextools/holders?chain=${chain}&address=${address}&pageSize=20`
        );

        if (!response.ok) {
          // API might not be configured, show graceful message
          if (response.status === 503) {
            setError('DEXTools API not configured. Add DEXTOOLS_API_KEY to enable.');
            return;
          }
          throw new Error(`Failed to fetch holder data: ${response.statusText}`);
        }

        const data = await response.json();
        setHolderData(data);
      } catch (err) {
        console.error('DEXTools panel error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (chain && address) {
      fetchHolderData();

      // Refresh every 2 minutes (holder data doesn't change frequently)
      const interval = setInterval(fetchHolderData, 120000);
      return () => clearInterval(interval);
    }
  }, [chain, address]);

  if (loading) {
    return (
      <div className={`p-6 border rounded-lg ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 border rounded-lg ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
        <div className="text-center">
          <p className="text-yellow-500 font-semibold mb-2">Holder Analysis Unavailable</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!holderData) {
    return (
      <div className={`p-6 border rounded-lg ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
        <p className="text-gray-400 text-center">No holder data available</p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Token Holder Analysis
        </h3>
        <p className="text-sm text-gray-400">
          Total Holders: {holderData.totalHolders.toLocaleString()}
        </p>
      </div>

      {/* Distribution Summary */}
      <div className="p-4">
        <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Supply Distribution
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Top 10 Holders</span>
            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {holderData.distribution.top10Percentage.toFixed(2)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${Math.min(holderData.distribution.top10Percentage, 100)}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-400">Top 50 Holders</span>
            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {holderData.distribution.top50Percentage.toFixed(2)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full"
              style={{ width: `${Math.min(holderData.distribution.top50Percentage, 100)}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-400">Top 100 Holders</span>
            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {holderData.distribution.top100Percentage.toFixed(2)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${Math.min(holderData.distribution.top100Percentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Top Holders List */}
      <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
        <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Top Holders
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {holderData.holders.slice(0, 10).map((holder, index) => (
            <div
              key={holder.address}
              className={`flex items-center justify-between p-2 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400 w-6">#{index + 1}</span>
                <div>
                  <p className={`text-xs font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                  </p>
                  {holder.tag && (
                    <p className="text-xs text-blue-400">{holder.tag}</p>
                  )}
                  {holder.isContract && (
                    <span className="text-xs text-yellow-500">Contract</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {holder.percentage.toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
