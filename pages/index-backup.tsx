import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Activity,
  ArrowRight,
  User,
  Database,
  TrendingUp,
  Clock,
  Users,
  Lock
} from 'lucide-react';
import HydrationSafe from '@/components/HydrationSafe';

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Redirect authenticated users to advisories
      router.push('/admin/eagle-nest');
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
    { value: "&lt; 100ms", label: "Response Time", icon: <Clock className="h-5 w-5" /> },
    { value: "10M+", label: "Threats Analyzed", icon: <Shield className="h-5 w-5" /> },
    { value: "24/7", label: "Monitoring", icon: <Activity className="h-5 w-5" /> }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6
      }
    }
  };

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
            <motion.div 
              className="text-center space-y-8"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              
              {/* Main Logo and Title */}
              <motion.div 
                className="space-y-6"
                variants={itemVariants}
              >
                <div className="flex justify-center">
                  <motion.div 
                    className="p-6 rounded-2xl bg-glass-gradient backdrop-blur-glass border border-white/10 shadow-glass"
                    whileHover={{ scale: 1.05, rotateY: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Shield className="h-16 w-16 text-neon-blue mx-auto" />
                  </motion.div>
                </div>
                
                <div className="space-y-4">
                  <motion.h1 
                    className="font-orbitron font-bold text-5xl md:text-7xl bg-gradient-to-r from-white via-neon-blue to-neon-purple bg-clip-text text-transparent"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                  >
                    EaglEye IntelDesk
                  </motion.h1>
                  <motion.div 
                    className="font-rajdhani text-xl md:text-2xl text-white/80 tracking-wider"
                    variants={itemVariants}
                  >
                    ADVANCED CYBERSECURITY INTELLIGENCE PLATFORM
                  </motion.div>
                </div>
              </motion.div>

              {/* Description */}
              <motion.div 
                className="max-w-4xl mx-auto space-y-6"
                variants={itemVariants}
              >
                <p className="font-rajdhani text-lg md:text-xl text-white/70 leading-relaxed">
                  Next-generation threat intelligence platform powered by AI and machine learning. 
                  Real-time monitoring, automated analysis, and comprehensive threat detection 
                  for enterprise-grade cybersecurity operations.
                </p>
              </motion.div>

              {/* Action Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                variants={itemVariants}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link 
                    href="/login"
                    className="group flex items-center gap-3 px-8 py-4 rounded-xl bg-button-gradient border border-neon-blue/30 hover:shadow-button-glow-hover transition-all duration-300 font-rajdhani font-semibold text-white"
                  >
                    <Activity className="h-5 w-5" />
                    GET STARTED
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </motion.div>
                
                {!isAuthenticated && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link 
                      href="/login"
                      className="group flex items-center gap-3 px-8 py-4 rounded-xl bg-glass-gradient border border-white/20 hover:border-neon-purple/30 hover:bg-neon-purple/10 transition-all duration-300 font-rajdhani font-semibold text-white"
                    >
                      <User className="h-5 w-5" />
                      SECURE LOGIN
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="relative py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
            >
              {stats.map((stat, index) => (
                <motion.div 
                  key={index}
                  className="text-center p-6 rounded-xl bg-glass-gradient backdrop-blur-glass border border-white/10 shadow-glass hover:border-neon-blue/30 transition-all duration-300"
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
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
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Features Section */}
        <div className="relative py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="font-orbitron font-bold text-3xl md:text-4xl text-white mb-4">
                ADVANCED CAPABILITIES
              </h2>
              <p className="font-rajdhani text-lg text-white/70 max-w-2xl mx-auto">
                Enterprise-grade security intelligence with cutting-edge technology and real-time threat analysis
              </p>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-2 gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
            >
              {features.map((feature, index) => (
                <motion.div 
                  key={index}
                  className="group p-8 rounded-xl bg-glass-gradient backdrop-blur-glass border border-white/10 shadow-glass hover:border-white/20 hover:shadow-glass-hover transition-all duration-500"
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                >
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  <div className="relative space-y-4">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        className="p-3 rounded-lg bg-glass-200 border border-white/20"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.3 }}
                      >
                        {feature.icon}
                      </motion.div>
                      <h3 className="font-orbitron font-semibold text-xl text-white">
                        {feature.title}
                      </h3>
                    </div>
                    
                    <p className="font-rajdhani text-white/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div 
              className="p-12 rounded-2xl bg-glass-gradient backdrop-blur-glass border border-white/10 shadow-glass space-y-8"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="space-y-4">
                <h2 className="font-orbitron font-bold text-3xl md:text-4xl text-white">
                  SECURE YOUR INFRASTRUCTURE
                </h2>
                <p className="font-rajdhani text-lg text-white/70 max-w-2xl mx-auto">
                  Join thousands of security professionals using our platform to stay ahead of emerging threats and protect their organizations.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link 
                    href="/advisories"
                    className="group flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-button-gradient border border-neon-blue/30 hover:shadow-button-glow-hover transition-all duration-300 font-rajdhani font-semibold text-white"
                  >
                    <Shield className="h-5 w-5" />
                    START MONITORING
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </motion.div>
                
                {!isAuthenticated && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link 
                      href="/login"
                      className="group flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-glass-gradient border border-white/20 hover:border-neon-purple/30 hover:bg-neon-purple/10 transition-all duration-300 font-rajdhani font-semibold text-white"
                    >
                      <Lock className="h-5 w-5" />
                      SECURE ACCESS
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative border-t border-white/10 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center space-y-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
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
            </motion.div>
          </div>
        </footer>
      </div>
    </HydrationSafe>
  );
}
