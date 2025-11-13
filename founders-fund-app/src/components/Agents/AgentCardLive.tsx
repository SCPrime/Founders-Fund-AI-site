'use client';

import React from 'react';
import { useLivePrice } from '@/hooks/useLivePrice';

interface AgentCardLiveProps {
  agent: {
    id: string;
    name: string;
    symbol: string;
    status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
    allocation: number;
    realizedPnl: number;
    unrealizedPnl: number;
    totalValue: number;
    winRate: number;
    tradeCount: number;
    deployed: string;
    chain?: string;
    address?: string;
    holdings?: number; // Number of tokens held
  };
  onPause?: (agentId: string) => void;
  onResume?: (agentId: string) => void;
  onClose?: (agentId: string) => void;
  onClick?: (agentId: string) => void;
}

export default function AgentCardLive({ agent, onPause, onResume, onClose, onClick }: AgentCardLiveProps) {
  // Subscribe to live price if chain and address are provided
  const livePrice = useLivePrice({
    symbol: agent.symbol,
    chain: agent.chain || 'solana',
    address: agent.address || '',
    enabled: Boolean(agent.chain && agent.address && agent.status === 'ACTIVE'),
  });

  // Calculate live unrealized P&L if we have live price and holdings
  const liveTotalValue = agent.holdings && livePrice.price
    ? agent.holdings * livePrice.price
    : agent.totalValue;

  const liveUnrealizedPnl = agent.holdings && livePrice.price
    ? liveTotalValue - Number(agent.allocation)
    : agent.unrealizedPnl;

  const totalPnl = Number(agent.realizedPnl) + Number(liveUnrealizedPnl);
  const pnlPercent = agent.allocation > 0 ? (totalPnl / Number(agent.allocation)) * 100 : 0;
  const isProfitable = totalPnl >= 0;

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800 border-green-300',
    PAUSED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    CLOSED: 'bg-gray-100 text-gray-800 border-gray-300'
  };

  const statusDotColors = {
    ACTIVE: 'bg-green-500',
    PAUSED: 'bg-yellow-500',
    CLOSED: 'bg-gray-500'
  };

  // Price change indicator
  const priceChangeColor = livePrice.change24h && livePrice.change24h >= 0 ? 'text-green-600' : 'text-red-600';
  const priceChangeIcon = livePrice.change24h && livePrice.change24h >= 0 ? '↑' : '↓';

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer relative"
      onClick={() => onClick && onClick(agent.id)}
    >
      {/* Live Price Indicator */}
      {livePrice.isConnected && agent.status === 'ACTIVE' && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs text-gray-500">LIVE</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
            <span className="text-sm font-mono text-gray-500">{agent.symbol}</span>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[agent.status]}`}>
            <span className={`w-2 h-2 rounded-full ${statusDotColors[agent.status]}`}></span>
            {agent.status}
          </div>
        </div>
      </div>

      {/* Live Price Display */}
      {livePrice.price && agent.status === 'ACTIVE' && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Current Price</span>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                ${livePrice.price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 8
                })}
              </p>
              {livePrice.change24h !== null && (
                <p className={`text-xs font-medium ${priceChangeColor}`}>
                  {priceChangeIcon} {Math.abs(livePrice.change24h).toFixed(2)}% 24h
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Allocation */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Allocation</p>
          <p className="text-sm font-semibold text-gray-900">
            ${Number(agent.allocation).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Total Value - Live or Static */}
        <div>
          <p className="text-xs text-gray-500 mb-1">
            Total Value
            {livePrice.isConnected && agent.status === 'ACTIVE' && (
              <span className="ml-1 text-green-500">●</span>
            )}
          </p>
          <p className="text-sm font-semibold text-gray-900">
            ${Number(liveTotalValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Realized P&L */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Realized P&L</p>
          <p className={`text-sm font-semibold ${Number(agent.realizedPnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Number(agent.realizedPnl) >= 0 ? '+' : ''}${Number(agent.realizedPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Unrealized P&L - Live or Static */}
        <div>
          <p className="text-xs text-gray-500 mb-1">
            Unrealized P&L
            {livePrice.isConnected && agent.status === 'ACTIVE' && (
              <span className="ml-1 text-green-500">●</span>
            )}
          </p>
          <p className={`text-sm font-semibold ${Number(liveUnrealizedPnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Number(liveUnrealizedPnl) >= 0 ? '+' : ''}${Number(liveUnrealizedPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Total P&L Banner */}
      <div className={`rounded-lg p-2 mb-3 ${isProfitable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">
            Total P&L
            {livePrice.isConnected && agent.status === 'ACTIVE' && (
              <span className="ml-1 text-green-500">●</span>
            )}
          </span>
          <div className="text-right">
            <p className={`text-lg font-bold ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>
              {isProfitable ? '+' : ''}${totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
              {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">Win Rate</p>
          <p className="text-sm font-semibold text-gray-900">{agent.winRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Trades</p>
          <p className="text-sm font-semibold text-gray-900">{agent.tradeCount}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {agent.status === 'ACTIVE' && onPause && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPause(agent.id);
            }}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-300 rounded hover:bg-yellow-100 transition-colors"
          >
            Pause
          </button>
        )}
        {agent.status === 'PAUSED' && onResume && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResume(agent.id);
            }}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-300 rounded hover:bg-green-100 transition-colors"
          >
            Resume
          </button>
        )}
        {agent.status !== 'CLOSED' && onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Are you sure you want to close ${agent.name}? This action cannot be undone.`)) {
                onClose(agent.id);
              }
            }}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-300 rounded hover:bg-red-100 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
