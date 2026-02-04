import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // Redirect authenticated users to Eagle Nest
        router.replace('/admin/eagle-nest');
      } else {
        // Redirect unauthenticated users to login
        router.replace('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen bg-tech-gradient flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div className="text-neon-blue font-orbitron text-lg tracking-wider animate-pulse">
          INITIALIZING SYSTEM...
        </div>
      </div>
    </div>
  );
}

export default Home;
