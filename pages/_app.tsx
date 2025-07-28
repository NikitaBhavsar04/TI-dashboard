import '@/styles/globals-new.css';
import type { AppProps } from 'next/app';
import Navbar from '@/components/NavbarClean';
import { AuthProvider } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if current page is an advisory detail page
  const isAdvisoryDetailPage = router.pathname === '/advisory/[id]';

  if (!mounted) {
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

  return (
    <AuthProvider>
      <div className="min-h-screen bg-tech-gradient relative overflow-hidden">
        {/* Subtle background texture */}
        <div className="absolute inset-0 bg-gradient-to-br from-tech-navy/20 via-transparent to-tech-purple/10 pointer-events-none"></div>
        
        {/* Main content */}
        <div className="relative z-10">
          {/* Only show navbar if not on advisory detail page */}
          {!isAdvisoryDetailPage && <Navbar />}
          <main className="transition-all duration-300 ease-in-out">
            <Component {...pageProps} />
          </main>
        </div>

        {/* Ambient glow effects */}
        <div className="fixed top-0 left-0 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="fixed bottom-0 right-0 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
    </AuthProvider>
  );
}
