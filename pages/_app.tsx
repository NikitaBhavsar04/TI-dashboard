import '@/styles/globals-new.css';
import type { AppProps } from 'next/app';
import Sidebar from '@/components/Sidebar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence, motion } from 'framer-motion';
import type { NextRouter } from 'next/router';

function AppContent({ Component, pageProps, router }: AppProps & { router: NextRouter }) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Start Agenda in development
    if (process.env.NODE_ENV !== 'production') {
      fetch('/api/start-agenda', { method: 'POST' })
        .then(res => res.json())
        .then(data => console.log('📧 Agenda startup:', data))
        .catch(err => console.error('❌ Failed to start Agenda:', err));
    }
  }, []);

  // Check if current page is an advisory detail page
  const isAdvisoryDetailPage = router.pathname === '/advisory/[id]';

  // Show sidebar only when authenticated
  const showSidebar = isAuthenticated && !isAdvisoryDetailPage;

  return (
    <div className="min-h-screen bg-tech-gradient relative overflow-hidden flex">
      {/* Enhanced background with parallax effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pointer-events-none parallax-slow"></div>
      
      {/* Sidebar Navigation */}
      {showSidebar && <Sidebar />}
      
      {/* Main content with page transitions */}
      <div className="relative z-10 flex-1">
        <AnimatePresence mode="wait">
          <motion.main
            key={router.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1]
            }}
            className="page-transition"
          >
            <Component {...pageProps} />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App(props: AppProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-tech-gradient flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-blue-400 font-poppins text-lg tracking-wide animate-pulse">
            INITIALIZING SYSTEM...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent {...props} router={router} />
      </ToastProvider>
    </AuthProvider>
  );
}
