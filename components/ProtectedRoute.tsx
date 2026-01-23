import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import HydrationSafe from '@/components/HydrationSafe';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  adminOnly = false, 
  requireAdmin = false,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(redirectTo);
        return;
      }

      if ((adminOnly || requireAdmin) && !isAdmin) {
        router.push('/admin/eagle-nest'); // Redirect non-admin users to Eagle Nest
        return;
      }
    }
  }, [user, loading, isAdmin, adminOnly, requireAdmin, router, redirectTo]);

  if (loading) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
          <div className="text-cyber-green font-mono">Loading...</div>
        </div>
      </HydrationSafe>
    );
  }

  if (!user || ((adminOnly || requireAdmin) && !isAdmin)) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
          <div className="text-cyber-red font-mono">Access Denied</div>
        </div>
      </HydrationSafe>
    );
  }

  return <>{children}</>;
}
