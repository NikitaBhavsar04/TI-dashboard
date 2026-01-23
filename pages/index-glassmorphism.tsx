import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, 
  Upload, 
  Search, 
  AlertTriangle, 
  Users, 
  Globe, 
  Lock,
  Eye,
  Zap,
  Terminal,
  FileText,
  Activity,
  ArrowRight,
  User
} from 'lucide-react';
// If HydrationSafe exists at ../components/HydrationSafe.tsx, use:
import HydrationSafe from '../components/HydrationSafe';

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Redirect authenticated users to advisories
      router.push('/admin/eagle-nest');
    }
  }, [isAuthenticated, loading, router]);

  return (
    <HydrationSafe>
      <div className="min-h-screen relative cyber-background">
        <Head>
          <title>EaglEye IntelDesk INTELLIGENCE - Cyber Threat Analysis Platform</title>
          <meta name="description" content="Advanced threat intelligence and advisory platform" />
        </Head>

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              
              {/* Main Logo and Title */}
              <div className="mb-8 animate-fade-in-up">
                <Shield className="h-24 w-24 text-neon-blue mx-auto mb-6 neon-glow" />
                <h1 className="heading-glass text-5xl md:text-7xl mb-4">
                  EaglEye IntelDesk
                </h1>
                <h2 className="heading-glass text-2xl md:text-3xl text-neon-cyan mb-6">
                  INTELLIGENCE PLATFORM
                </h2>
                <p className="text-lg text-secondary max-w-3xl mx-auto leading-relaxed">
                  Advanced cyber threat intelligence, analysis, and advisory platform 
                  providing real-time threat monitoring and comprehensive security insights.
                  <span className="block mt-4 text-neon-magenta text-base font-semibold">
                    🔒 SECURE ACCESS REQUIRED - LOGIN TO VIEW THREAT ADVISORIES
                  </span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-scale-in">
                <Link href="/login" className="btn-neon text-lg px-8 py-4">
                  <User className="h-5 w-5" />
                  SECURE LOGIN
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/login" className="btn-glass text-lg px-8 py-4">
                  <Shield className="h-5 w-5" />
                  ACCESS PLATFORM
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="heading-glass text-3xl mb-4">
              PLATFORM CAPABILITIES
            </h2>
            <p className="text-secondary">
              Comprehensive threat intelligence and analysis tools
            </p>
            <div className="mt-4 glass-intense p-4 inline-block">
              <p className="text-neon-magenta text-sm">
                🔒 CLASSIFIED ACCESS - AUTHENTICATION REQUIRED FOR ALL INTELLIGENCE DATA
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-scale-in">
            
            {/* Threat Intelligence */}
            <div className="card-glass">
              <div className="space-y-4">
                <AlertTriangle className="h-12 w-12 text-neon-magenta mx-auto neon-magenta" />
                <h3 className="text-lg font-bold text-neon-magenta text-center">
                  REAL-TIME ANALYSIS
                </h3>
                <ul className="space-y-2 text-secondary text-sm">
                  <li>• Advanced threat detection</li>
                  <li>• MITRE ATT&CK mapping</li>
                  <li>• IOC identification</li>
                  <li>• Risk assessment</li>
                </ul>
              </div>
            </div>

            {/* Advisory Management */}
            <div className="card-glass">
              <div className="space-y-4">
                <FileText className="h-12 w-12 text-neon-blue mx-auto neon-glow" />
                <h3 className="text-lg font-bold text-neon-blue text-center">
                  COMPREHENSIVE REPORTING
                </h3>
                <ul className="space-y-2 text-secondary text-sm">
                  <li>• Detailed threat advisories</li>
                  <li>• Vulnerability assessments</li>
                  <li>• Mitigation strategies</li>
                  <li>• Executive summaries</li>
                </ul>
              </div>
            </div>

            {/* Security Operations */}
            <div className="card-glass">
              <div className="space-y-4">
                <Shield className="h-12 w-12 text-neon-cyan mx-auto neon-glow" />
                <h3 className="text-lg font-bold text-neon-cyan text-center">
                  OPERATIONAL SECURITY
                </h3>
                <ul className="space-y-2 text-secondary text-sm">
                  <li>• Role-based access control</li>
                  <li>• Secure authentication</li>
                  <li>• Activity monitoring</li>
                  <li>• Audit logging</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="glass-intense p-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <Activity className="h-8 w-8 text-neon-cyan mx-auto mb-2 neon-glow" />
                <p className="text-secondary text-sm mb-1">SYSTEM STATUS</p>
                <span className="bg-green-500/20 text-green-300 border border-green-500/30 px-3 py-1 rounded-full text-xs font-semibold">
                  OPERATIONAL
                </span>
              </div>
              <div className="text-center">
                <Globe className="h-8 w-8 text-neon-blue mx-auto mb-2 neon-glow" />
                <p className="text-secondary text-sm mb-1">THREAT FEEDS</p>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-semibold">
                  ACTIVE
                </span>
              </div>
              <div className="text-center">
                <Terminal className="h-8 w-8 text-neon-purple mx-auto mb-2 neon-purple" />
                <p className="text-secondary text-sm mb-1">ANALYSIS ENGINE</p>
                <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-3 py-1 rounded-full text-xs font-semibold">
                  PROCESSING
                </span>
              </div>
              <div className="text-center">
                <Lock className="h-8 w-8 text-neon-magenta mx-auto mb-2 neon-magenta" />
                <p className="text-secondary text-sm mb-1">SECURITY</p>
                <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1 rounded-full text-xs font-semibold">
                  ENHANCED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-glass navbar-glass">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p className="text-secondary text-sm">
                EaglEye IntelDesk INTELLIGENCE PLATFORM - CONFIDENTIAL
              </p>
              <p className="text-muted text-xs mt-2">
                Advanced Cyber Threat Analysis & Intelligence System
              </p>
            </div>
          </div>
        </div>
      </div>
    </HydrationSafe>
  );
}
