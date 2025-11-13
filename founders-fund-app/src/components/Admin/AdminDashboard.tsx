'use client';

import { useState } from 'react';
import ActivityLogPanel from './ActivityLogPanel';
import SystemStatsPanel from './SystemStatsPanel';
import UserManagementPanel from './UserManagementPanel';

type Tab = 'stats' | 'users' | 'activity';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            System Statistics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Activity Logs
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'stats' && <SystemStatsPanel />}
        {activeTab === 'users' && <UserManagementPanel />}
        {activeTab === 'activity' && <ActivityLogPanel />}
      </div>
    </div>
  );
}
