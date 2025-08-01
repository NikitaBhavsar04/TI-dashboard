import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import HydrationSafe from '@/components/HydrationSafe';
import { Mail, Lock, Eye, EyeOff, Shield, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

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
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-tech-gradient flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="text-neon-blue font-orbitron text-lg tracking-wider animate-pulse">
              AUTHENTICATING...
            </div>
          </div>
        </div>
      </HydrationSafe>
    );
  }

  return (
    <HydrationSafe>
      <div className="min-h-screen bg-tech-gradient relative flex items-center justify-center px-4 py-20">
        <Head>
          <title>Secure Login - EaglEye IntelDesk Intelligence Platform</title>
          <meta name="description" content="Secure access to the EaglEye IntelDesk cybersecurity intelligence platform" />
        </Head>

        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Back to Home */}
        <Link 
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 rounded-lg bg-glass-gradient border border-white/10 hover:border-neon-blue/30 hover:bg-neon-blue/10 transition-all duration-300 font-rajdhani font-medium text-white/90 hover:text-neon-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          BACK TO HOME
        </Link>

        <div className="relative w-full max-w-md">
          <div className="p-8 rounded-2xl bg-glass-gradient backdrop-blur-glass border border-white/10 shadow-glass space-y-8 animate-fade-in">
            
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-2xl bg-neon-blue/10 border border-neon-blue/20">
                  <Shield className="h-12 w-12 text-neon-blue" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="font-orbitron font-bold text-2xl text-white">
                  SECURE ACCESS
                </h1>
                <p className="font-rajdhani text-white/70">
                  Enter your credentials to access the intelligence platform
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 animate-fade-in">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <span className="font-rajdhani text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block font-rajdhani font-semibold text-white/90 text-sm tracking-wider">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-white/40" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-glass-200 border border-white/20 focus:border-neon-blue/50 focus:bg-glass-300 transition-all duration-300 font-rajdhani text-white placeholder-white/40 focus:outline-none"
                    placeholder="analyst@threatwatch.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block font-rajdhani font-semibold text-white/90 text-sm tracking-wider">
                  PASSWORD
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-white/40" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-lg bg-glass-200 border border-white/20 focus:border-neon-blue/50 focus:bg-glass-300 transition-all duration-300 font-rajdhani text-white placeholder-white/40 focus:outline-none"
                    placeholder="Enter your secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white/70 transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-button-gradient border border-neon-blue/30 hover:shadow-button-glow-hover transition-all duration-300 font-rajdhani font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    SECURE LOGIN
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="pt-6 border-t border-white/10">
              <div className="p-4 rounded-lg bg-glass-100 border border-white/10 space-y-3">
                <div className="font-rajdhani font-semibold text-white/90 text-sm">
                  🔓 DEMO CREDENTIALS
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm font-rajdhani">
                  <div className="flex justify-between">
                    <span className="text-white/60">Email:</span>
                    <span className="text-neon-cyan font-medium">admin@threatwatch.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Password:</span>
                    <span className="text-neon-cyan font-medium">admin123</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="font-rajdhani text-white/60 text-sm">
                Secured by military-grade encryption
              </p>
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-glass-100 border border-white/10">
              <Lock className="h-4 w-4 text-neon-blue" />
              <span className="font-rajdhani text-white/70 text-sm">256-BIT SSL ENCRYPTED</span>
            </div>
          </div>
        </div>
      </div>
    </HydrationSafe>
  );
}
