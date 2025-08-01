import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, 
  Search, 
  User,
  Lock
} from 'lucide-react';
import HydrationSafe from '../components/HydrationSafe';

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Redirect authenticated users to advisories
      router.push('/advisories');
    }
  }, [isAuthenticated, loading, router]);

  return (
    <HydrationSafe>
      <div className="min-h-screen relative">
        <Head>
          <title>EaglEye IntelDesk - Cybersecurity Intelligence Platform</title>
          <meta name="description" content="Advanced cybersecurity threat intelligence platform with real-time monitoring and AI-powered analysis." />
        </Head>

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative z-10">
            <div className="text-center">
              
              {/* Main Logo and Title */}
              <div className="mb-12">
                <Shield className="h-32 w-32 mx-auto mb-8 text-cyber-blue" />
                <h1 className="text-6xl md:text-8xl font-mono font-bold mb-6 text-white">
                  EaglEye IntelDesk
                </h1>
                <h2 className="text-2xl md:text-3xl font-mono font-bold text-cyber-blue mb-8">
                  Intelligence Platform
                </h2>
                <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-8">
                  Advanced cybersecurity threat intelligence platform powered by AI. 
                  Real-time monitoring, predictive analysis, and automated response systems 
                  for the next generation of cyber defense.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20">
                <Link href="/advisories" className="btn-cyber btn-primary text-lg px-10 py-4">
                  <Search className="h-5 w-5" />
                  BROWSE INTEL
                </Link>
                <Link href="/login" className="btn-cyber btn-secondary text-lg px-10 py-4">
                  <User className="h-5 w-5" />
                  ACCESS SYSTEM
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HydrationSafe>
  );
}
