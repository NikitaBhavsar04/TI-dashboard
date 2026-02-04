import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import UserManagement from '../../components/UserManagement';
import LoadingLogo from '../../components/LoadingLogo';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const AdminUsersPage: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      
      if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        router.push('/');
        return;
      }
    }
  }, [user, isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingLogo message="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <UserManagement />;
};

export default AdminUsersPage;
