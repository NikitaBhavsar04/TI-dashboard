import React from 'react';
import { GetServerSideProps } from 'next';
import { verifyToken } from '../../lib/auth';
import EmailDashboardFinal from '../../components/EmailDashboardFinal';

interface EmailTrackingFinalPageProps {
  userRole: string;
}

const EmailTrackingFinalPage: React.FC<EmailTrackingFinalPageProps> = ({ userRole }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Simple Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-white">Email Tracking Analytics</h1>
          <p className="text-gray-400 text-sm">User Role: {userRole}</p>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <EmailDashboardFinal />
      </main>
    </div>
  );
};

export default EmailTrackingFinalPage;

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const token = req.cookies.token;

  if (!token) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  try {
    const decoded = verifyToken(token);
    return {
      props: {
        userRole: decoded.role || 'user',
      },
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
};
