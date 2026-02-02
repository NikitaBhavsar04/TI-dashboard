import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedBackground from '@/components/AnimatedBackground';
import { 
  Shield, 
  Activity,
  ArrowRight,
  User,
  Database,
  TrendingUp,
  Clock,
  Users,
  Lock,
  Zap,
  Globe,
  Eye,
  Cpu,
  Network,
  AlertTriangle
} from 'lucide-react';

function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const features = [
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Advanced Threat Intelligence",
      description: "AI-powered threat detection with real-time analysis and automated response capabilities.",
      color: "neon-blue"
    },
    {
      icon: <Activity className="h-8 w-8" />,
      title: "Live Security Monitoring",
      description: "24/7 continuous monitoring with instant alerts and comprehensive threat classification.",
      color: "neon-purple"
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: "IOC Intelligence Hub",
      description: "Comprehensive indicators of compromise database with automated correlation and analysis.",
      color: "neon-cyan"
    },
    {
      icon: <Network className="h-8 w-8" />,
      title: "Global Threat Network",
      description: "Connected intelligence network providing worldwide threat visibility and protection.",
      color: "neon-green"
    },
    {
      icon: <Cpu className="h-8 w-8" />,
      title: "AI-Powered Analysis",
      description: "Machine learning algorithms for predictive threat analysis and behavioral detection.",
      color: "neon-pink"
    },
    {
      icon: <Eye className="h-8 w-8" />,
      title: "Threat Visualization",
      description: "Interactive dashboards and real-time threat landscape visualization tools.",
      color: "neon-purple"
    }
  ];

  const stats = [
    {
      icon: <AlertTriangle className="h-6 w-6" />,
      label: "Active Threats",
      value: "1,247",
      change: "+12%",
      color: "neon-blue"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      label: "Protected Assets",
      value: "99.9%",
      change: "+0.1%",
      color: "neon-green"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      label: "Response Time",
      value: "< 30s",
      change: "-15%",
      color: "neon-purple"
    },
    {
      icon: <Users className="h-6 w-6" />,
      label: "Global Users",
      value: "50K+",
      change: "+25%",
      color: "neon-pink"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-tech-gradient flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="spinner-neon mx-auto"></div>
          <div className="text-neon-blue font-orbitron text-lg tracking-wider animate-pulse">
            INITIALIZING SYSTEM...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative min-h-screen bg-tech-gradient">
        <AnimatedBackground opacity={0.8} />
        <div className="relative z-10">
          <Head>
            <title>EaglEye IntelDesk - Advanced Cybersecurity Intelligence Platform</title>
            <meta name="description" content="Next-generation cybersecurity threat intelligence platform with AI-powered analysis, real-time monitoring, and comprehensive threat protection." />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </Head>

        {/* Hero Section */}
        <section className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-8">
              {/* Main Heading */}
              <div className="space-y-4">
                <h1 className="font-orbitron font-bold text-5xl md:text-7xl lg:text-8xl text-gradient-blue leading-tight pb-3">
                  EaglEye IntelDesk
                </h1>
                <div className="h-1 w-32 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink mx-auto rounded-full"></div>
                <p className="font-rajdhani text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                  Advanced Cybersecurity Intelligence Platform
                </p>
              </div>

              {/* Subtitle */}
              <p className="font-rajdhani text-lg text-slate-400 max-w-4xl mx-auto leading-relaxed">
                Next-generation threat intelligence powered by AI, delivering real-time protection 
                against evolving cyber threats with comprehensive analysis and automated response capabilities.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                {/* <Link href="/login" className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-2 border-cyan-400/50 rounded-xl backdrop-blur-md transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] hover:scale-105 transform">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center gap-3 text-white font-orbitron font-semibold">
                    <Shield className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 group-hover:drop-shadow-[0_0_12px_rgba(0,212,255,0.8)] transition-all duration-300" />
                    <span className="group-hover:text-cyan-100 transition-colors duration-300">Access Platform</span>
                    <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 group-hover:text-cyan-300 transition-all duration-300" />
                  </div>
                </Link> */}
                <Link href="/login" className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-2 border-cyan-400/50 rounded-xl backdrop-blur-md transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 transform">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center gap-3 text-white font-orbitron font-semibold">
                    <Shield className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 group-hover:drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-all duration-300" />
                    <span className="group-hover:text-cyan-100 transition-colors duration-300">Access Platform</span>
                    <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 group-hover:text-cyan-300 transition-all duration-300" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Background Elements */}
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl animate-pulse opacity-60"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl animate-pulse opacity-60" style={{ animationDelay: '2s' }}></div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="glass-card p-6 text-center hover-glow group">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-${stat.color}/20 to-${stat.color}/10 mb-4 group-hover:from-${stat.color}/30 group-hover:to-${stat.color}/20 transition-all duration-300`}>
                    <div className={`text-${stat.color}`}>
                      {stat.icon}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-orbitron font-bold text-2xl text-slate-100">
                      {stat.value}
                    </div>
                    <div className="font-rajdhani font-medium text-slate-400">
                      {stat.label}
                    </div>
                    <div className={`text-sm font-rajdhani font-semibold text-${stat.color}`}>
                      {stat.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-orbitron font-bold text-4xl md:text-5xl text-gradient-purple mb-4">
                Advanced Capabilities
              </h2>
              <p className="font-rajdhani text-lg text-slate-400 max-w-3xl mx-auto">
                Comprehensive cybersecurity solutions powered by cutting-edge technology 
                and AI-driven intelligence for maximum protection.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="glass-card p-8 hover-glow group">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-${feature.color}/20 to-${feature.color}/10 mb-6 group-hover:from-${feature.color}/30 group-hover:to-${feature.color}/20 transition-all duration-300`}>
                    <div className={`text-${feature.color} group-hover:drop-shadow-[0_0_8px_rgba(0,212,255,0.6)] transition-all duration-300`}>
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="font-orbitron font-semibold text-xl text-slate-100 mb-4 group-hover:text-neon-blue transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="font-rajdhani text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="glass-card p-12 hover-glow">
              <div className="space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 mb-6">
                  <Shield className="w-10 h-10 text-neon-blue" />
                </div>
                <h2 className="font-orbitron font-bold text-3xl md:text-4xl text-gradient-blue">
                  Ready to Secure Your Digital Assets?
                </h2>
                <p className="font-rajdhani text-lg text-slate-400 max-w-2xl mx-auto">
                  Join thousands of security professionals who trust EaglEye IntelDesk 
                  for comprehensive cyber threat intelligence and protection.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <Link href="/login" className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-2 border-blue-400/50 rounded-xl backdrop-blur-md transition-all duration-300 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-105 transform">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-3 text-white font-orbitron font-semibold">
                      <User className="w-5 h-5 text-blue-400 group-hover:text-blue-300 group-hover:drop-shadow-[0_0_12px_rgba(59,130,246,0.8)] transition-all duration-300" />
                      <span className="group-hover:text-blue-100 transition-colors duration-300">Get Started</span>
                      <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 group-hover:text-blue-300 transition-all duration-300" />
                    </div>
                  </Link>
                  <Link href="/advisories" className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-2 border-emerald-400/50 rounded-xl backdrop-blur-md transition-all duration-300 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 transform">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-3 text-white font-orbitron font-semibold">
                      <Globe className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 group-hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.8)] transition-all duration-300" />
                      <span className="group-hover:text-emerald-100 transition-colors duration-300">Explore Live Threats</span>
                      <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:text-emerald-300 transition-all duration-300" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
          <div className="max-w-7xl mx-auto text-center">
            <p className="font-rajdhani text-slate-500">
              © 2025 EaglEye IntelDesk. Advanced Cybersecurity Intelligence Platform.
            </p>
          </div>
        </footer>
        </div>
      </div>
    </>
  );
}

export default Home;
