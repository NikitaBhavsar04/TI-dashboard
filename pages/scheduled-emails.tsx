import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import HydrationSafe from '@/components/HydrationSafe';
import LoadingLogo from '@/components/LoadingLogo';
import ScheduledEmailsManager from '@/components/ScheduledEmailsManager';
import EditScheduledEmailModal from '@/components/EditScheduledEmailModal';
import { verifyToken } from '@/lib/auth';

export default function ScheduledEmailsPage() {
  const { hasRole, isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [editEmailModalOpen, setEditEmailModalOpen] = useState(false);
  const [editingEmailData, setEditingEmailData] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Client-side authentication check
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    } else if (!loading && isAuthenticated && user && !hasRole('admin')) {
      router.push('/admin/eagle-nest');
    }
  }, [isAuthenticated, loading, router, user, hasRole]);

  const handleEditEmail = (email: any) => {
    setEditingEmailData(email);
    setEditEmailModalOpen(true);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUpdate = () => {
    setEditEmailModalOpen(false);
    setEditingEmailData(null);
    handleRefresh();
  };

  return (
    <HydrationSafe>
      {/* Show loading state while checking authentication */}
      {loading && (
        <div className="min-h-screen bg-tech-gradient flex items-center justify-center">
          <LoadingLogo message="Loading..." />
        </div>
      )}

      {/* Show content only if authenticated and admin */}
      {!loading && isAuthenticated && hasRole('admin') && (
        <>
          <div className="relative min-h-screen bg-tech-gradient pt-8 pb-12 w-full overflow-x-hidden">
            <div className="relative z-10 w-full">
              <Head>
                <title>Scheduled Emails - EaglEye IntelDesk</title>
                <meta name="description" content="Manage scheduled advisory emails" />
              </Head>

              <div className="w-full px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="mb-8"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="mb-6 lg:mb-0">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-2 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl backdrop-blur-sm border border-violet-500/30">
                          <Calendar className="h-6 w-6 text-violet-400" />
                        </div>
                        <div>
                          <h1 className="font-orbitron font-bold text-2xl md:text-3xl bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                            Scheduled Emails
                          </h1>
                          <p className="font-rajdhani text-base text-slate-400 mt-1">
                            Manage and monitor scheduled advisory email notifications
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Scheduled Emails Manager */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <ScheduledEmailsManager
                    onEditEmail={handleEditEmail}
                    onClose={() => router.push('/admin/eagle-nest')}
                    onRefresh={handleRefresh}
                    key={refreshTrigger}
                  />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Edit Scheduled Email Modal */}
          {editEmailModalOpen && editingEmailData && (
            <EditScheduledEmailModal
              isOpen={editEmailModalOpen}
              onClose={() => {
                setEditEmailModalOpen(false);
                setEditingEmailData(null);
              }}
              scheduledEmail={editingEmailData}
              onUpdate={handleUpdate}
            />
          )}
        </>
      )}
    </HydrationSafe>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  // Check authentication first
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
    // Verify the token
    const decoded = await verifyToken(token);
    if (!decoded) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    // Check if user is admin or super_admin
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return {
        redirect: {
          destination: '/admin/eagle-nest',
          permanent: false,
        },
      };
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {}
  };
};
