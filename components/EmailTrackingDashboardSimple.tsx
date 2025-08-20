import React from 'react';

interface EmailTrackingDashboardSimpleProps {
  className?: string;
}

const EmailTrackingDashboardSimple: React.FC<EmailTrackingDashboardSimpleProps> = ({ className = '' }) => {
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
            value="7d"
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
          <div className="text-3xl font-bold text-white mb-1">0</div>
          <div className="text-sm text-gray-400">Last 7 Days</div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-500/20 p-2 rounded-lg">
              <span className="text-green-400">👁️</span>
            </div>
            <h3 className="font-semibold text-gray-300">Open Rate</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">0%</div>
          <div className="text-sm text-gray-400">0 of 0 opened</div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-yellow-500/20 p-2 rounded-lg">
              <span className="text-yellow-400">👆</span>
            </div>
            <h3 className="font-semibold text-gray-300">Click Rate</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">0%</div>
          <div className="text-sm text-gray-400">0 recipients clicked</div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <span className="text-purple-400">⏱️</span>
            </div>
            <h3 className="font-semibold text-gray-300">Avg. Time to Open</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">0m</div>
          <div className="text-sm text-gray-400">Average response time</div>
        </div>
      </div>

      {/* Placeholder content */}
      <div className="text-center text-gray-400 py-12">
        <p>Email tracking dashboard loading...</p>
        <p className="text-sm mt-2">Configure email tracking to see analytics</p>
      </div>
    </div>
  );
};

export default EmailTrackingDashboardSimple;
