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
  User,
  Database,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
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

  const features = [
    {
      icon: <Shield className="h-8 w-8 text-neon-blue" />,
      title: "Real-Time Threat Intelligence",
      description: "Advanced AI-powered threat detection and analysis with instant notifications.",
      gradient: "from-neon-blue/20 to-transparent"
    },
    {
      icon: <Activity className="h-8 w-8 text-neon-purple" />,
      title: "Live Security Monitoring",
      description: "24/7 monitoring with automated incident response and threat classification.",
      gradient: "from-neon-purple/20 to-transparent"
    },
    {
      icon: <Database className="h-8 w-8 text-neon-cyan" />,
      title: "Comprehensive IOC Database",
      description: "Extensive indicators of compromise database with automated correlation.",
      gradient: "from-neon-cyan/20 to-transparent"
    },
    {
      icon: <Users className="h-8 w-8 text-neon-pink" />,
      title: "Collaborative Analysis",
      description: "Team-based threat hunting with shared intelligence and collaborative workflows.",
      gradient: "from-neon-pink/20 to-transparent"
    }
  ];

  const stats = [
    { value: "99.9%", label: "Uptime", icon: <TrendingUp className="h-5 w-5" /> },
    { value: "< 100ms", label: "Response Time", icon: <Clock className="h-5 w-5" /> },
    { value: "10M+", label: "Threats Analyzed", icon: <Shield className="h-5 w-5" /> },
    { value: "24/7", label: "Monitoring", icon: <Activity className="h-5 w-5" /> }
  ];

  return (
    <HydrationSafe>
      <div className="min-h-screen bg-tech-gradient relative">
        <Head>
          <title>EaglEye IntelDesk - Advanced Cybersecurity Intelligence Platform</title>
          <meta name="description" content="Advanced threat intelligence and advisory platform with real-time monitoring and AI-powered analysis" />
        </Head>

        {/* Hero Section */}
        <div className="relative overflow-hidden pt-20">
          {/* Background Effects */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center space-y-8">
              
              {/* Main Logo and Title */}
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-center">
                  <div className="p-6 rounded-2xl bg-glass-gradient backdrop-blur-glass border border-white/10 shadow-glass">
                    <Shield className="h-16 w-16 text-neon-blue mx-auto" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h1 className="font-orbitron font-bold text-5xl md:text-7xl bg-gradient-to-r from-white via-neon-blue to-neon-purple bg-clip-text text-transparent">
                    EaglEye IntelDesk
                  </h1>
                  <div className="font-rajdhani text-xl md:text-2xl text-white/80 tracking-wider">
                    ADVANCED CYBERSECURITY INTELLIGENCE PLATFORM
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <p className="font-rajdhani text-lg md:text-xl text-white/70 leading-relaxed">
                  Next-generation threat intelligence platform powered by AI and machine learning. 
                  Real-time monitoring, automated analysis, and comprehensive threat detection 
                  for enterprise-grade cybersecurity operations.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <Link 
                  href="/advisories"
                  className="group flex items-center gap-3 px-8 py-4 rounded-xl bg-button-gradient border border-neon-blue/30 hover:shadow-button-glow-hover transition-all duration-300 font-rajdhani font-semibold text-white"
                >
                  <Activity className="h-5 w-5" />
                  ACCESS INTEL FEED
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
                
                {!isAuthenticated && (
                  <Link 
                    href="/login"
                    className="group flex items-center gap-3 px-8 py-4 rounded-xl bg-glass-gradient border border-white/20 hover:border-neon-purple/30 hover:bg-neon-purple/10 transition-all duration-300 font-rajdhani font-semibold text-white"
                  >
                    <User className="h-5 w-5" />
                    SECURE LOGIN
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="relative py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div 
                  key={index}
                  className="text-center p-6 rounded-xl bg-glass-gradient backdrop-blur-glass border border-white/10 shadow-glass hover:border-neon-blue/30 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="flex justify-center mb-3">
                    <div className="p-3 rounded-lg bg-neon-blue/10 border border-neon-blue/20">
                      {stat.icon}
                    </div>
                  </div>
                  <div className="font-orbitron font-bold text-2xl md:text-3xl text-neon-blue mb-1">
                    {stat.value}
                  </div>
                  <div className="font-rajdhani text-sm text-white/60 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="relative py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="font-orbitron font-bold text-3xl md:text-4xl text-white mb-4">
                ADVANCED CAPABILITIES
              </h2>
              <p className="font-rajdhani text-lg text-white/70 max-w-2xl mx-auto">
                Enterprise-grade security intelligence with cutting-edge technology and real-time threat analysis
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="group p-8 rounded-xl bg-glass-gradient backdrop-blur-glass border border-white/10 shadow-glass hover:border-white/20 hover:shadow-glass-hover transition-all duration-500 animate-fade-in-up"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  <div className="relative space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-glass-200 border border-white/20 group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </div>
                      <h3 className="font-orbitron font-semibold text-xl text-white">
                        {feature.title}
                      </h3>
                    </div>
                    
                    <p className="font-rajdhani text-white/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="p-12 rounded-2xl bg-glass-gradient backdrop-blur-glass border border-white/10 shadow-glass space-y-8 animate-fade-in">
              <div className="space-y-4">
                <h2 className="font-orbitron font-bold text-3xl md:text-4xl text-white">
                  SECURE YOUR INFRASTRUCTURE
                </h2>
                <p className="font-rajdhani text-lg text-white/70 max-w-2xl mx-auto">
                  Join thousands of security professionals using our platform to stay ahead of emerging threats and protect their organizations.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/advisories"
                  className="group flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-button-gradient border border-neon-blue/30 hover:shadow-button-glow-hover transition-all duration-300 font-rajdhani font-semibold text-white"
                >
                  <Shield className="h-5 w-5" />
                  START MONITORING
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
                
                {!isAuthenticated && (
                  <Link 
                    href="/login"
                    className="group flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-glass-gradient border border-white/20 hover:border-neon-purple/30 hover:bg-neon-purple/10 transition-all duration-300 font-rajdhani font-semibold text-white"
                  >
                    <Lock className="h-5 w-5" />
                    SECURE ACCESS
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative border-t border-white/10 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center items-center gap-3">
                <Shield className="h-6 w-6 text-neon-blue" />
                <span className="font-orbitron font-bold text-lg text-white">EaglEye IntelDesk</span>
              </div>
              <p className="font-rajdhani text-white/60">
                Advanced Cybersecurity Intelligence Platform © 2024
              </p>
              <div className="flex justify-center gap-6 text-sm font-rajdhani text-white/50">
                <span>Enterprise Grade Security</span>
                <span>•</span>
                <span>24/7 Monitoring</span>
                <span>•</span>
                <span>AI-Powered Analysis</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </HydrationSafe>
  );
}
              <div className="mb-8">
                <HolographicOverlay>
                  <Shield className="h-24 w-24 text-cyber-blue mx-auto mb-6" />
                </HolographicOverlay>
                <h1 className="text-5xl md:text-7xl font-mono font-bold mb-4">
                  <NeonText color="red" intensity="high">
                    EaglEye IntelDesk
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
                EaglEye IntelDesk INTELLIGENCE PLATFORM - CONFIDENTIAL
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
