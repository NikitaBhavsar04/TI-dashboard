import React from 'react';

interface EmailTrackingDashboardTestProps {
  className?: string;
}

const EmailTrackingDashboardTest: React.FC<EmailTrackingDashboardTestProps> = ({ className = '' }) => {
  return (
    <div className={`${className}`}>
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl text-white">Email Tracking Dashboard Test</h2>
        <p className="text-gray-400">This is a minimal test component</p>
      </div>
    </div>
  );
};

export default EmailTrackingDashboardTest;
