import React, { useState } from 'react';

interface EmailTrackingDashboardNewProps {
  className?: string;
}

const EmailTrackingDashboardNew: React.FC<EmailTrackingDashboardNewProps> = ({ className = '' }) => {
  const [timeRange, setTimeRange] = useState('7d');

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
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
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            📊 Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <span className="text-blue-400">📧</span>
            </div>
            <h3 className="font-semibold text-gray-300">Total Emails</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">156</div>
          <div className="text-sm text-gray-400">Last 7 Days</div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-500/20 p-2 rounded-lg">
              <span className="text-green-400">👁️</span>
            </div>
            <h3 className="font-semibold text-gray-300">Open Rate</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">68%</div>
          <div className="text-sm text-gray-400">106 of 156 opened</div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-yellow-500/20 p-2 rounded-lg">
              <span className="text-yellow-400">👆</span>
            </div>
            <h3 className="font-semibold text-gray-300">Click Rate</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">32%</div>
          <div className="text-sm text-gray-400">50 recipients clicked</div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <span className="text-purple-400">⏱️</span>
            </div>
            <h3 className="font-semibold text-gray-300">Avg. Time to Open</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">2h 15m</div>
          <div className="text-sm text-gray-400">Average response time</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Opens */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-green-400">👁️</span>
            Recent Email Opens
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
              <div>
                <div className="text-white text-sm">john.doe@example.com</div>
                <div className="text-gray-400 text-xs">CVE-2024-0001 Advisory</div>
              </div>
              <div className="text-gray-400 text-xs">2 min ago</div>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
              <div>
                <div className="text-white text-sm">sarah.smith@example.com</div>
                <div className="text-gray-400 text-xs">Security Update Alert</div>
              </div>
              <div className="text-gray-400 text-xs">5 min ago</div>
            </div>
            <div className="flex justify-between items-center py-2">
              <div>
                <div className="text-white text-sm">mike.wilson@example.com</div>
                <div className="text-gray-400 text-xs">CVE-2024-0002 Advisory</div>
              </div>
              <div className="text-gray-400 text-xs">12 min ago</div>
            </div>
          </div>
        </div>

        {/* Recent Clicks */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-yellow-400">👆</span>
            Recent Link Clicks
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
              <div>
                <div className="text-white text-sm">jane.doe@example.com</div>
                <div className="text-gray-400 text-xs">Patch Download Link</div>
              </div>
              <div className="text-gray-400 text-xs">3 min ago</div>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
              <div>
                <div className="text-white text-sm">alex.brown@example.com</div>
                <div className="text-gray-400 text-xs">Vendor Advisory Link</div>
              </div>
              <div className="text-gray-400 text-xs">8 min ago</div>
            </div>
            <div className="flex justify-between items-center py-2">
              <div>
                <div className="text-white text-sm">chris.garcia@example.com</div>
                <div className="text-gray-400 text-xs">Mitigation Guide</div>
              </div>
              <div className="text-gray-400 text-xs">15 min ago</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-blue-400">📊</span>
          Email Performance Over Time
        </h3>
        <div className="h-64 bg-gray-900/50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 mb-2">📈</div>
            <div className="text-gray-400 text-sm">Chart visualization coming soon</div>
            <div className="text-gray-500 text-xs mt-1">Open rates, click rates, and delivery trends</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTrackingDashboardNew;
