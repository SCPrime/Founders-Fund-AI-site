'use client';

import { useEffect, useState } from 'react';

interface ActivityItem {
  id: string;
  type: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

interface ActivityResponse {
  activities: ActivityItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    type: string;
    days: number;
  };
}

export default function ActivityLogPanel() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<number>(7);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        type: typeFilter,
        days: daysFilter.toString(),
      });

      const response = await fetch(`/api/admin/activity?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      const data: ActivityResponse = await response.json();
      setActivities(data.activities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [page, typeFilter, daysFilter]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_created':
        return '👤';
      case 'trade_executed':
        return '💹';
      case 'agent_deployed':
        return '🤖';
      case 'scan_processed':
        return '🔍';
      default:
        return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_created':
        return 'bg-blue-100 text-blue-800';
      case 'trade_executed':
        return 'bg-green-100 text-green-800';
      case 'agent_deployed':
        return 'bg-purple-100 text-purple-800';
      case 'scan_processed':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleString();
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by activity type"
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Activities</option>
          <option value="users">User Activities</option>
          <option value="trades">Trade Activities</option>
          <option value="agents">Agent Activities</option>
          <option value="scans">Scan Activities</option>
        </select>
        <select
          value={daysFilter}
          onChange={(e) => {
            setDaysFilter(parseInt(e.target.value));
            setPage(1);
          }}
          aria-label="Filter by time period"
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="1">Last 24 hours</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchActivities}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No activities found for the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 text-2xl">{getActivityIcon(activity.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${getActivityColor(
                      activity.type,
                    )}`}
                  >
                    {activity.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-900">{activity.description}</p>
                {activity.userName && (
                  <p className="text-xs text-gray-500 mt-1">
                    User: {activity.userName}
                    {activity.userEmail && ` (${activity.userEmail})`}
                  </p>
                )}
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      View details
                    </summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                      {JSON.stringify(activity.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {activities.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">Showing page {page} of activities</div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={activities.length < 50}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
