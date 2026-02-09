import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import LoadingLogo from './LoadingLogo';

interface RoleProtectedProps {
  children: ReactNode;
  requiredRole?: 'user' | 'admin' | 'super_admin';
  fallbackRoute?: string;
  loadingMessage?: string;
}

/**
 * RoleProtected Component
 * 
 * Protects routes based on user roles with automatic redirects.
 * Uses the role hierarchy from AuthContext (user: 1, admin: 2, super_admin: 3).
 * 
 * @param children - The content to render if access is granted
 * @param requiredRole - Minimum role required to access the content (default: 'user') 
 * @param fallbackRoute - Where to redirect if access is denied (default: '/login')
 * @param loadingMessage - Message to show while checking authentication
 * 
 * @example
 * // Protect admin page
 * <RoleProtected requiredRole="admin">
 *   <AdminDashboard />
 * </RoleProtected>
 * 
 * // Protect user page (accessible by all authenticated users)
 * <RoleProtected requiredRole="user">
 *   <EagleNestView />
 * </RoleProtected>
 */
const RoleProtected: React.FC<RoleProtectedProps> = ({ 
  children, 
  requiredRole = 'user',
  fallbackRoute = '/login',
  loadingMessage = 'Checking permissions...'
}) => {
  const { user, isAuthenticated, hasRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Not authenticated at all
      if (!isAuthenticated || !user) {
        router.push(fallbackRoute);
        return;
      }

      // Authenticated but insufficient role
      if (!hasRole(requiredRole)) {
        // Redirect based on user's actual role
        if (user.role === 'user') {
          router.push('/admin/eagle-nest');
        } else if (hasRole('admin')) {
          router.push('/admin');
        } else {
          router.push('/');
        }
        return;
      }
    }
  }, [user, isAuthenticated, hasRole, loading, router, requiredRole, fallbackRoute]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingLogo message={loadingMessage} />
      </div>
    );
  }

  // Show access denied if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-400">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  // Show access denied if insufficient role
  if (!hasRole(requiredRole)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-2">
            You don't have permission to access this page.
          </p>
          <p className="text-gray-500 text-sm">
            Required role: <span className="text-cyan-400">{requiredRole}</span> | 
            Your role: <span className="text-cyan-400">{user.role}</span>
          </p>
        </div>
      </div>
    );
  }

  // User has sufficient permissions, render protected content
  return <>{children}</>;
};

export default RoleProtected;