import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
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
import { CyberCard, CyberButton, CyberBadge } from '@/components/ui/cyber-components';
import { HolographicOverlay, NeonText, TerminalWindow } from '@/components/ui/cyber-effects';
import HydrationSafe from '@/components/HydrationSafe';

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
      <div className="min-h-screen bg-cyber-dark">
        <Head>
          <title>THREATWATCH INTELLIGENCE - Cyber Threat Analysis Platform</title>
          <meta name="description" content="Advanced threat intelligence and advisory platform" />
        </Head>

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              
              {/* Main Logo and Title */}
              <div className="mb-8">
                <HolographicOverlay>
                  <Shield className="h-24 w-24 text-cyber-blue mx-auto mb-6" />
                </HolographicOverlay>
                <h1 className="text-5xl md:text-7xl font-mono font-bold mb-4">
                  <NeonText color="red" intensity="high">
                    THREATWATCH
                  </NeonText>
                </h1>
                <h2 className="text-2xl md:text-3xl font-mono font-bold text-cyber-blue mb-6">
                  INTELLIGENCE PLATFORM
                </h2>
                <p className="text-lg text-cyber-green/80 font-mono max-w-3xl mx-auto leading-relaxed">
                  Advanced cyber threat intelligence, analysis, and advisory platform 
                  providing real-time threat monitoring and comprehensive security insights.
                  <span className="block mt-4 text-cyber-red/80 text-base">
                    🔒 SECURE ACCESS REQUIRED - LOGIN TO VIEW THREAT ADVISORIES
                  </span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Link href="/login">
                  <CyberButton variant="cyber" glowColor="blue" className="text-lg">
                    <User className="h-5 w-5 mr-2" />
                    SECURE LOGIN
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </CyberButton>
                </Link>
                <Link href="/login">
                  <CyberButton variant="neon" glowColor="green" className="text-lg">
                    <Shield className="h-5 w-5 mr-2" />
                    ACCESS PLATFORM
                  </CyberButton>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-mono font-bold text-cyber-blue mb-4">
              PLATFORM CAPABILITIES
            </h2>
            <p className="text-cyber-green/70 font-mono">
              Comprehensive threat intelligence and analysis tools
            </p>
            <div className="mt-4 p-4 bg-cyber-dark/30 border border-cyber-red/30 rounded-lg inline-block">
              <p className="text-cyber-red font-mono text-sm">
                🔒 CLASSIFIED ACCESS - AUTHENTICATION REQUIRED FOR ALL INTELLIGENCE DATA
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Threat Intelligence */}
            <CyberCard variant="matrix" className="p-6">
              <TerminalWindow title="THREAT INTELLIGENCE">
                <div className="space-y-4">
                  <HolographicOverlay>
                    <AlertTriangle className="h-12 w-12 text-cyber-red mx-auto" />
                  </HolographicOverlay>
                  <h3 className="text-lg font-mono font-bold text-cyber-red text-center">
                    REAL-TIME ANALYSIS
                  </h3>
                  <ul className="space-y-2 text-cyber-green/80 font-mono text-sm">
                    <li>• Advanced threat detection</li>
                    <li>• MITRE ATT&CK mapping</li>
                    <li>• IOC identification</li>
                    <li>• Risk assessment</li>
                  </ul>
                </div>
              </TerminalWindow>
            </CyberCard>

            {/* Advisory Management */}
            <CyberCard variant="holographic" className="p-6">
              <TerminalWindow title="ADVISORY SYSTEM">
                <div className="space-y-4">
                  <HolographicOverlay>
                    <FileText className="h-12 w-12 text-cyber-blue mx-auto" />
                  </HolographicOverlay>
                  <h3 className="text-lg font-mono font-bold text-cyber-blue text-center">
                    COMPREHENSIVE REPORTING
                  </h3>
                  <ul className="space-y-2 text-cyber-green/80 font-mono text-sm">
                    <li>• Detailed threat advisories</li>
                    <li>• Vulnerability assessments</li>
                    <li>• Mitigation strategies</li>
                    <li>• Executive summaries</li>
                  </ul>
                </div>
              </TerminalWindow>
            </CyberCard>

            {/* Security Operations */}
            <CyberCard variant="neon" glowColor="green" className="p-6">
              <TerminalWindow title="SECURITY OPS">
                <div className="space-y-4">
                  <HolographicOverlay>
                    <Shield className="h-12 w-12 text-cyber-green mx-auto" />
                  </HolographicOverlay>
                  <h3 className="text-lg font-mono font-bold text-cyber-green text-center">
                    OPERATIONAL SECURITY
                  </h3>
                  <ul className="space-y-2 text-cyber-green/80 font-mono text-sm">
                    <li>• Role-based access control</li>
                    <li>• Secure authentication</li>
                    <li>• Activity monitoring</li>
                    <li>• Audit logging</li>
                  </ul>
                </div>
              </TerminalWindow>
            </CyberCard>
          </div>
        </div>

        {/* System Status */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CyberCard variant="glitch" className="p-6">
            <TerminalWindow title="SYSTEM STATUS">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <Activity className="h-8 w-8 text-cyber-green mx-auto mb-2" />
                  <p className="font-mono text-cyber-green text-sm mb-1">SYSTEM STATUS</p>
                  <CyberBadge variant="success">OPERATIONAL</CyberBadge>
                </div>
                <div className="text-center">
                  <Globe className="h-8 w-8 text-cyber-blue mx-auto mb-2" />
                  <p className="font-mono text-cyber-green text-sm mb-1">THREAT FEEDS</p>
                  <CyberBadge variant="info">ACTIVE</CyberBadge>
                </div>
                <div className="text-center">
                  <Terminal className="h-8 w-8 text-cyber-purple mx-auto mb-2" />
                  <p className="font-mono text-cyber-green text-sm mb-1">ANALYSIS ENGINE</p>
                  <CyberBadge variant="warning">PROCESSING</CyberBadge>
                </div>
                <div className="text-center">
                  <Lock className="h-8 w-8 text-cyber-red mx-auto mb-2" />
                  <p className="font-mono text-cyber-green text-sm mb-1">SECURITY</p>
                  <CyberBadge variant="danger">ENHANCED</CyberBadge>
                </div>
              </div>
            </TerminalWindow>
          </CyberCard>
        </div>

        {/* Footer */}
        <footer className="border-t border-cyber-blue/30 bg-cyber-dark/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p className="text-cyber-green/60 font-mono text-sm">
                THREATWATCH INTELLIGENCE PLATFORM - CONFIDENTIAL
              </p>
              <p className="text-cyber-green/40 font-mono text-xs mt-2">
                Advanced Cyber Threat Analysis & Intelligence System
              </p>
            </div>
          </div>
        </footer>
      </div>
    </HydrationSafe>
  );
}
