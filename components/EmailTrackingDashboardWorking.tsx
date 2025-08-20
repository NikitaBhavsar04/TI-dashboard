import React, { useState } from 'react';

interface EmailTrackingDashboardWorkingProps {
  className?: string;
}

const EmailTrackingDashboardWorking: React.FC<EmailTrackingDashboardWorkingProps> = ({ className = '' }) => {
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
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white mb-4">📱 Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span>📧</span>
                <span className="text-sm font-medium text-white">Security Alert</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-green-400">85% open</div>
                <div className="text-xs text-gray-400">45 recipients</div>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span>📧</span>
                <span className="text-sm font-medium text-white">Threat Advisory</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-green-400">72% open</div>
                <div className="text-xs text-gray-400">28 recipients</div>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span>📧</span>
                <span className="text-sm font-medium text-white">Weekly Summary</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-green-400">56% open</div>
                <div className="text-xs text-gray-400">83 recipients</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white mb-4">📈 Performance Trends</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">This Week</span>
              <span className="text-green-400 font-semibold">+12%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">This Month</span>
              <span className="text-green-400 font-semibold">+8%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Click Through Rate</span>
              <span className="text-yellow-400 font-semibold">32%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Bounce Rate</span>
              <span className="text-red-400 font-semibold">5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">156</div>
          <div className="text-sm text-gray-400">Total Sends</div>
        </div>
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">106</div>
          <div className="text-sm text-gray-400">Total Opens</div>
        </div>
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">50</div>
          <div className="text-sm text-gray-400">Total Clicks</div>
        </div>
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">8</div>
          <div className="text-sm text-gray-400">Bounced</div>
        </div>
      </div>
    </div>
  );
};

export default EmailTrackingDashboardWorking;
