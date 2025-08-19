import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { RefreshCw, Mail, Eye, MousePointer, TrendingUp, Calendar, Activity, Download, Search, Filter } from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalEmails: number;
    totalOpens: number;
    uniqueOpens: number;
    totalClicks: number;
    uniqueClicks: number;
    openRate: number;
    clickRate: number;
    clickToOpenRate: number;
  };
  chartData: Array<{
    date: string;
    emails: number;
    opens: number;
    clicks: number;
  }>;
  topEmails: Array<{
    advisoryId: string;
    email: string;
    opens: number;
    clicks: number;
    createdAt: string;
  }>;
  recentActivity: number;
}

interface TrackingDetail {
  trackingId: string;
  email: string;
  advisoryId: string;
  openCount: number;
  clickCount: number;
  createdAt: string;
  lastOpenAt?: string;
  lastClickAt?: string;
  events: Array<{
    type: string;
    timestamp: string;
    userAgent?: string;
    ip?: string;
    url?: string;
  }>;
}

export default function Analytics() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrackingId, setSelectedTrackingId] = useState<string | null>(null);
  const [trackingDetails, setTrackingDetails] = useState<TrackingDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'super_admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === 'super_admin') {
      fetchAnalyticsData();
    }
  }, [user]);

  const fetchAnalyticsData = async () => {
    try {
      setDataLoading(true);
      setError(null);
      
      const response = await fetch('/api/analytics/data-simple');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchTrackingDetails = async (trackingId: string) => {
    try {
      setDetailsLoading(true);
      
      const response = await fetch(`/api/tracking/details?trackingId=${trackingId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tracking details');
      }
      
      const data = await response.json();
      setTrackingDetails(data);
    } catch (error) {
      console.error('Error fetching tracking details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load tracking details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (dateFilter.from) params.append('dateFrom', dateFilter.from);
      if (dateFilter.to) params.append('dateTo', dateFilter.to);
      
      const response = await fetch(`/api/analytics/export?${params}`);
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `email-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `email-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
      setError(error instanceof Error ? error.message : 'Failed to export data');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (user.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-slate-400">Only super administrators can access analytics.</p>
        </div>
      </div>
    );
  }

  const filteredEmails = analyticsData?.topEmails.filter(email =>
    email.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.advisoryId.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-20">
        <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white font-rajdhani mb-4">
              Email Analytics Dashboard
            </h1>
            <p className="text-slate-400 font-rajdhani">
              Track email engagement and performance metrics
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => exportData('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => exportData('json')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
            <button
              onClick={fetchAnalyticsData}
              disabled={dataLoading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Date Filters */}
        <div className="mb-6 bg-slate-800/50 border border-slate-600/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <h3 className="text-white font-medium">Date Filters (for export)</h3>
          </div>
          <div className="flex gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">From Date</label>
              <input
                type="date"
                value={dateFilter.from}
                onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                className="px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">To Date</label>
              <input
                type="date"
                value={dateFilter.to}
                onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                className="px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded text-sm"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-600/50 rounded-lg">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400"></div>
          </div>
        ) : analyticsData ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-cyan-400 font-bold">Total Emails</h3>
                  <Mail className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-2xl text-white font-bold">{analyticsData.overview.totalEmails}</p>
                <p className="text-xs text-slate-400">Sent to recipients</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-green-400 font-bold">Unique Opens</h3>
                  <Eye className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-2xl text-white font-bold">{analyticsData.overview.uniqueOpens}</p>
                <p className="text-xs text-slate-400">{analyticsData.overview.openRate}% open rate</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-purple-400 font-bold">Total Opens</h3>
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-2xl text-white font-bold">{analyticsData.overview.totalOpens}</p>
                <p className="text-xs text-slate-400">Including repeat opens</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-orange-400 font-bold">Total Clicks</h3>
                  <MousePointer className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-2xl text-white font-bold">{analyticsData.overview.totalClicks}</p>
                <p className="text-xs text-slate-400">{analyticsData.overview.clickRate}% click rate</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Recent Activity</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                  <Calendar className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{analyticsData.recentActivity}</p>
                  <p className="text-sm text-slate-400">Emails (Last 7 days)</p>
                </div>
                <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                  <Eye className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {analyticsData.chartData.reduce((sum, day) => sum + day.opens, 0)}
                  </p>
                  <p className="text-sm text-slate-400">Opens (Last 7 days)</p>
                </div>
                <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                  <MousePointer className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {analyticsData.chartData.reduce((sum, day) => sum + day.clicks, 0)}
                  </p>
                  <p className="text-sm text-slate-400">Clicks (Last 7 days)</p>
                </div>
              </div>
            </div>

            {/* Top Performing Emails */}
            {analyticsData.topEmails.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Top Performing Emails</h2>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search emails..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-slate-700 text-white border border-slate-600 rounded text-sm w-64"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredEmails.map((email, index) => (
                    <div key={`${email.advisoryId}-${index}`} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors" 
                         onClick={() => fetchTrackingDetails(`track-00${index + 1}-1755509439111`)}>
                      <div>
                        <p className="text-white font-medium">{email.email}</p>
                        <p className="text-xs text-slate-400">
                          Advisory: {email.advisoryId} • {new Date(email.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">{email.opens} opens</p>
                        <p className="text-purple-400 text-sm">{email.clicks} clicks</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tracking Details Modal */}
            {selectedTrackingId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Tracking Details</h3>
                    <button
                      onClick={() => {
                        setSelectedTrackingId(null);
                        setTrackingDetails(null);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {detailsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                    </div>
                  ) : trackingDetails ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 text-sm">Email</p>
                          <p className="text-white">{trackingDetails.email}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm">Advisory ID</p>
                          <p className="text-white">{trackingDetails.advisoryId}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm">Opens</p>
                          <p className="text-green-400 font-bold">{trackingDetails.openCount}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm">Clicks</p>
                          <p className="text-purple-400 font-bold">{trackingDetails.clickCount}</p>
                        </div>
                      </div>
                      
                      {trackingDetails.events.length > 0 && (
                        <div>
                          <h4 className="text-white font-bold mb-2">Event History</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {trackingDetails.events.map((event, index) => (
                              <div key={index} className="p-2 bg-slate-700/30 rounded text-sm">
                                <div className="flex justify-between items-center">
                                  <span className={`font-bold ${event.type === 'open' ? 'text-green-400' : 'text-purple-400'}`}>
                                    {event.type.toUpperCase()}
                                  </span>
                                  <span className="text-slate-400">
                                    {new Date(event.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                {event.url && (
                                  <p className="text-slate-300 truncate">URL: {event.url}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-slate-400">No analytics data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
