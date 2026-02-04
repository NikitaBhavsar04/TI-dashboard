import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, User, Lock, Shield, ArrowRight } from 'lucide-react';
import HydrationSafe from '@/components/HydrationSafe';
import LoadingLogo from '@/components/LoadingLogo';
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
      router.push('/admin/eagle-nest');
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
          <LoadingLogo message="INITIALIZING SYSTEM..." />
        </div>
      </HydrationSafe>
    );
  }

  return (
    <HydrationSafe>
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 w-full max-w-md mx-auto">
          <Head>
            <title>Login - EaglEye IntelDesk Intelligence Platform</title>
            <meta name="description" content="Access the EaglEye IntelDesk cybersecurity intelligence platform" />
          </Head>

          <div className="w-full space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16 rounded-full overflow-hidden">
                <img 
                  src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiCL2GuXkm4vnkAnNz1yA4Kxlg-jjKIOdohivr_s_uCRQ5z1gYjlSJX139c7I-iR-2i3sCVQK3kmP3_ZRvvBezy_m5eB-sX9N3cn42lJbi5PveE90jfqPt4Luc52J6nU1MTIWZGkdBzT76fTVru6Wk8RafSOcgNzPumjNLay5fUxQ_YIihCHQ7Us1_-wVMV/s400/Eagleye-S.png"
                  alt="EaglEye Logo"
                  className="w-full h-full object-contain p-2"
                  style={{ mixBlendMode: 'screen' }}
                />
              </div>
            </div>

            {/* Title */}
            <h1 className="font-poppins font-bold text-4xl text-gradient-blue heading-elegant mb-2">
              EaglEye IntelDesk
            </h1>
            <p className="font-inter text-slate-400 text-lg body-elegant">
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
              <h2 className="font-poppins font-semibold text-2xl text-slate-100 mb-2 subheading-refined">
                Secure Access
              </h2>
              <p className="font-inter text-slate-400 body-elegant">
                Enter your credentials to continue
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block font-poppins font-medium text-slate-300 mb-2">
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
                    placeholder="admin@forensiccybertech.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block font-poppins font-medium text-slate-300 mb-2">
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
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-400 transition-colors duration-300"
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
                  <p className="text-red-400 font-poppins text-sm">{error}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full btn-neon group btn-press hover-lift ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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

            {/* Back to Home */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="font-poppins text-slate-400 hover:text-blue-400 transition-colors duration-300"
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
        </div>
      </div>
    </HydrationSafe>
  );
}
