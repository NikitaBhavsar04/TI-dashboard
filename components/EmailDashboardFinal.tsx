import React, { useState, useEffect } from 'react';

interface EmailDashboardFinalProps {
  className?: string;
}

interface TrackingEvent {
  id: string;
  trackingId: string;
  recipientEmail: string;
  emailId: string;
  eventType: string;
  timestamp: string;
  timeAgo: string;
  linkUrl?: string;
}

interface TrackingStats {
  totalEmails: number;
  opens: number;
  clicks: number;
  uniqueOpeners: number;
  uniqueClickers: number;
  openRate: number;
  clickRate: number;
}

const EmailDashboardFinal: React.FC<EmailDashboardFinalProps> = ({ className = '' }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [stats, setStats] = useState<TrackingStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real-time tracking events
      const eventsResponse = await fetch(`/api/tracking/events?timeRange=${timeRange}&limit=10`);
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setRecentEvents(eventsData.events || []);
        setStats(eventsData.summary || null);
      } else {
        console.warn('Failed to fetch tracking events');
      }

    } catch (error) {
      console.error('Error fetching tracking data:', error);
      setError('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchTrackingData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const formatNumber = (num: number) => {
    return num?.toLocaleString() || '0';
  };

  const formatPercentage = (value: number) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  if (loading && !stats) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Email Tracking Analytics</h2>
            <p className="text-gray-400">Monitor email engagement and performance metrics</p>
          </div>
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button 
              onClick={fetchTrackingData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? '🔄' : '📊'} {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-600 rounded-lg text-red-200">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Total Emails</h3>
          <div className="text-3xl font-bold text-blue-400">
            {formatNumber(stats?.totalEmails || 0)}
          </div>
          <p className="text-sm text-gray-400">
            {timeRange === '1d' ? 'Last 24 Hours' : 
             timeRange === '7d' ? 'Last 7 Days' : 
             timeRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Open Rate</h3>
          <div className="text-3xl font-bold text-green-400">
            {formatPercentage(stats?.openRate || 0)}
          </div>
          <p className="text-sm text-gray-400">
            {formatNumber(stats?.opens || 0)} of {formatNumber(stats?.totalEmails || 0)} opened
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Click Rate</h3>
          <div className="text-3xl font-bold text-yellow-400">
            {formatPercentage(stats?.clickRate || 0)}
          </div>
          <p className="text-sm text-gray-400">
            {formatNumber(stats?.clicks || 0)} total clicks
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Unique Openers</h3>
          <div className="text-3xl font-bold text-purple-400">
            {formatNumber(stats?.uniqueOpeners || 0)}
          </div>
          <p className="text-sm text-gray-400">
            {formatNumber(stats?.uniqueClickers || 0)} unique clickers
          </p>
        </div>
      </div>

      {/* Real-time Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Opens */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-green-400">👁️</span>
            Recent Email Opens
            {loading && <span className="text-xs text-gray-400">(Updating...)</span>}
          </h3>
          <div className="space-y-3">
            {recentEvents
              .filter(event => event.eventType === 'open')
              .slice(0, 5)
              .map((event, index) => (
                <div key={event.id} className="flex justify-between items-center py-2 border-b border-gray-700/50">
                  <div>
                    <div className="text-white text-sm">{event.recipientEmail}</div>
                    <div className="text-gray-400 text-xs">Email ID: {event.emailId}</div>
                  </div>
                  <div className="text-gray-400 text-xs">{event.timeAgo}</div>
                </div>
              ))}
            
            {recentEvents.filter(event => event.eventType === 'open').length === 0 && (
              <div className="text-gray-400 text-sm py-4 text-center">
                No recent email opens
              </div>
            )}
          </div>
        </div>

        {/* Recent Clicks */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-yellow-400">👆</span>
            Recent Link Clicks
            {loading && <span className="text-xs text-gray-400">(Updating...)</span>}
          </h3>
          <div className="space-y-3">
            {recentEvents
              .filter(event => event.eventType === 'click')
              .slice(0, 5)
              .map((event, index) => (
                <div key={event.id} className="flex justify-between items-center py-2 border-b border-gray-700/50">
                  <div>
                    <div className="text-white text-sm">{event.recipientEmail}</div>
                    <div className="text-gray-400 text-xs">
                      {event.linkUrl ? `Link: ${event.linkUrl.substring(0, 30)}...` : 'Unknown link'}
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs">{event.timeAgo}</div>
                </div>
              ))}
            
            {recentEvents.filter(event => event.eventType === 'click').length === 0 && (
              <div className="text-gray-400 text-sm py-4 text-center">
                No recent link clicks
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-blue-400">📊</span>
          Activity Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-900/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {formatNumber(recentEvents.length)}
            </div>
            <div className="text-sm text-gray-400">Total Events</div>
          </div>
          <div className="text-center p-4 bg-gray-900/50 rounded-lg">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {formatNumber(recentEvents.filter(e => e.eventType === 'open').length)}
            </div>
            <div className="text-sm text-gray-400">Opens</div>
          </div>
          <div className="text-center p-4 bg-gray-900/50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {formatNumber(recentEvents.filter(e => e.eventType === 'click').length)}
            </div>
            <div className="text-sm text-gray-400">Clicks</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailDashboardFinal;
