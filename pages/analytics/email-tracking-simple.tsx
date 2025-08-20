// Super Simple Email Tracking Page
import React from 'react';
import { GetServerSideProps } from 'next';
import { verifyToken } from '../../lib/auth';

interface EmailTrackingPageProps {
  userRole: string;
}

const SimpleEmailTracking = ({ userRole }: EmailTrackingPageProps) => {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <h1 className="text-2xl font-bold text-white">Email Tracking Analytics</h1>
      <p className="text-gray-400 mt-4">User Role: {userRole}</p>
      <div className="bg-gray-800 p-6 rounded-lg mt-6">
        <p className="text-white">Dashboard component would go here</p>
      </div>
    </div>
  );
};

export default SimpleEmailTracking;

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
