import React from 'react';

interface EmailDashboardFinalProps {
  className?: string;
}

const EmailDashboardFinal: React.FC<EmailDashboardFinalProps> = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Email Tracking Analytics</h2>
        <p className="text-gray-400">Monitor email engagement and performance metrics</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Total Emails</h3>
          <div className="text-3xl font-bold text-blue-400">156</div>
          <p className="text-sm text-gray-400">Last 7 Days</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Open Rate</h3>
          <div className="text-3xl font-bold text-green-400">68%</div>
          <p className="text-sm text-gray-400">106 of 156 opened</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Click Rate</h3>
          <div className="text-3xl font-bold text-yellow-400">32%</div>
          <p className="text-sm text-gray-400">50 recipients clicked</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Avg. Response Time</h3>
          <div className="text-3xl font-bold text-purple-400">2h 15m</div>
          <p className="text-sm text-gray-400">Average time to open</p>
        </div>
      </div>

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Opens</h3>
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
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Clicks</h3>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailDashboardFinal;
