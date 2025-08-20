// Live Email Tracking Events Component
// File: components/LiveTrackingEvents.tsx

import React, { useState, useEffect } from 'react';
import { 
  EyeIcon, 
  CursorArrowRaysIcon, 
  ClockIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  GlobeAltIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface TrackingEvent {
  id: string;
  trackingId: string;
  recipientEmail: string;
  emailId: string;
  eventType: 'open' | 'click';
  timestamp: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os?: string;
    browser?: string;
  };
  ipAddress?: string;
  userAgent?: string;
  linkUrl?: string;
  linkId?: string;
  timeAgo: string;
}

interface EventsSummary {
  totalEvents: number;
  opens: number;
  clicks: number;
  uniqueOpeners: number;
  uniqueClickers: number;
  timeRange: string;
}

interface LiveTrackingEventsProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const LiveTrackingEvents: React.FC<LiveTrackingEventsProps> = ({ 
  className = '',
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [summary, setSummary] = useState<EventsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchEvents();
  }, [timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchEvents, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const fetchEvents = async () => {
    try {
      setError(null);

      const response = await fetch(`/api/tracking/events?timeRange=${timeRange}&limit=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setEvents(data.events || []);
        setSummary(data.summary || null);
        setLastRefresh(new Date());
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Events fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'open':
        return <EyeIcon className="w-4 h-4 text-blue-400" />;
      case 'click':
        return <CursorArrowRaysIcon className="w-4 h-4 text-green-400" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case 'mobile':
        return <DevicePhoneMobileIcon className="w-3 h-3 text-gray-400" />;
      case 'tablet':
        return <DeviceTabletIcon className="w-3 h-3 text-gray-400" />;
      case 'desktop':
      default:
        return <ComputerDesktopIcon className="w-3 h-3 text-gray-400" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'open':
        return 'border-l-blue-500 bg-blue-500/5';
      case 'click':
        return 'border-l-green-500 bg-green-500/5';
      default:
        return 'border-l-gray-500 bg-gray-500/5';
    }
  };

  const formatTimeRange = (range: string) => {
    const ranges = {
      '1h': 'Last Hour',
      '6h': 'Last 6 Hours', 
      '24h': 'Last 24 Hours',
      '7d': 'Last 7 Days'
    };
    return ranges[range] || range;
  };

  if (loading && events.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <div className="animate-pulse">
            <div className="flex justify-between items-center mb-6">
              <div className="h-6 bg-gray-700 rounded w-1/3"></div>
              <div className="h-8 bg-gray-700 rounded w-24"></div>
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-gray-700/30 rounded-lg">
                  <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-400">Live Events Error</h3>
            <button
              onClick={fetchEvents}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Retry
            </button>
          </div>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-1">Live Email Activity</h3>
            <p className="text-sm text-gray-400">
              Real-time tracking events • Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
            >
              <ArrowPathIcon className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-700/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{summary.totalEvents}</div>
              <div className="text-xs text-gray-400">Total Events</div>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{summary.opens}</div>
              <div className="text-xs text-gray-400">Opens</div>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-400">{summary.clicks}</div>
              <div className="text-xs text-gray-400">Clicks</div>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-400">{summary.uniqueOpeners}</div>
              <div className="text-xs text-gray-400">Unique Opens</div>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-yellow-400">{summary.uniqueClickers}</div>
              <div className="text-xs text-gray-400">Unique Clicks</div>
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <ClockIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recent activity in the {formatTimeRange(timeRange).toLowerCase()}</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className={`border-l-4 ${getEventColor(event.eventType)} rounded-r-lg p-3 hover:bg-gray-700/20 transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.eventType)}
                      <span className="text-sm font-medium text-white capitalize">
                        {event.eventType}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300">
                      {event.recipientEmail}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{event.timeAgo}</div>
                </div>

                <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    {event.device && getDeviceIcon(event.device.type)}
                    <span>
                      {event.device?.type || 'unknown'} • {event.device?.browser || 'unknown'}
                    </span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <GlobeAltIcon className="w-3 h-3" />
                      <span>{event.location.city || event.location.country || 'Unknown'}</span>
                    </div>
                  )}

                  {event.linkUrl && event.eventType === 'click' && (
                    <div className="flex items-center gap-1">
                      <CursorArrowRaysIcon className="w-3 h-3" />
                      <span className="truncate max-w-32" title={event.linkUrl}>
                        {event.linkId || 'Link clicked'}
                      </span>
                    </div>
                  )}
                </div>

                {event.eventType === 'click' && event.linkUrl && (
                  <div className="mt-1 text-xs text-blue-400 truncate">
                    → {event.linkUrl}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {events.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={fetchEvents}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Load more events
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTrackingEvents;
