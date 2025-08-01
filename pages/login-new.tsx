import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, User, Lock, Shield, ArrowRight } from 'lucide-react';
import HydrationSafe from '@/components/HydrationSafe';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/advisories');
    }
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (error: any) {
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-tech-gradient flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="spinner-neon mx-auto"></div>
            <div className="text-neon-blue font-orbitron text-lg tracking-wider animate-pulse">
              INITIALIZING SYSTEM...
            </div>
          </div>
        </div>
      </HydrationSafe>
    );
  }

  return (
    <HydrationSafe>
      <div className="min-h-screen bg-tech-gradient flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Head>
          <title>Login - EaglEye IntelDesk Intelligence Platform</title>
          <meta name="description" content="Access the EaglEye IntelDesk cybersecurity intelligence platform" />
        </Head>

        <div className="max-w-md w-full space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 hover-glow">
                <Shield className="w-12 h-12 text-neon-blue animate-pulse-glow" />
              </div>
            </div>

            {/* Title */}
            <h1 className="font-orbitron font-bold text-4xl text-gradient-blue mb-2">
              EaglEye IntelDesk
            </h1>
            <p className="font-rajdhani text-slate-400 text-lg">
              Access Intelligence Platform
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="glass-card p-8 hover-glow"
          >
            {/* Form Header */}
            <div className="text-center mb-8">
              <h2 className="font-orbitron font-semibold text-2xl text-slate-100 mb-2">
                Secure Access
              </h2>
              <p className="font-rajdhani text-slate-400">
                Enter your credentials to continue
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block font-rajdhani font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-glass pl-10 w-full"
                    placeholder="admin@threatwatch.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block font-rajdhani font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-glass pl-10 pr-10 w-full"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-neon-blue transition-colors duration-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-lg p-3"
                >
                  <p className="text-red-400 font-rajdhani text-sm">{error}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full btn-neon group ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <div className="spinner-neon w-5 h-5"></div>
                ) : (
                  <>
                    <Lock className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(0,212,255,0.8)] transition-all duration-300" />
                    <span>Access Platform</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-8 p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <h3 className="font-rajdhani font-semibold text-amber-400 mb-2">
                Demo Credentials
              </h3>
              <div className="space-y-1 text-sm font-jetbrains">
                <p className="text-slate-300">Email: admin@threatwatch.com</p>
                <p className="text-slate-300">Password: admin123</p>
              </div>
            </div>

            {/* Back to Home */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="font-rajdhani text-slate-400 hover:text-neon-blue transition-colors duration-300"
              >
                ← Back to Home
              </Link>
            </div>
          </motion.div>

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center"
          >
            <p className="font-rajdhani text-slate-500 text-sm">
              Protected by advanced encryption and multi-layer security protocols
            </p>
          </motion.div>
        </div>

        {/* Background Effects */}
        <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl animate-pulse opacity-60 pointer-events-none"></div>
        <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl animate-pulse opacity-60 pointer-events-none" style={{ animationDelay: '2s' }}></div>
      </div>
    </HydrationSafe>
  );
}
