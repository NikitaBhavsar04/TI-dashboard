import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { CyberCard, CyberButton } from '@/components/ui/cyber-components';
import { HolographicOverlay, NeonText, TerminalWindow } from '@/components/ui/cyber-effects';
import HydrationSafe from '@/components/HydrationSafe';
import { Mail, Lock, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';

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
        <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
          <div className="text-cyber-green font-mono">Loading...</div>
        </div>
      </HydrationSafe>
    );
  }

  return (
    <HydrationSafe>
      <div className="min-h-screen bg-cyber-dark">
        <Head>
          <title>Login - THREATWATCH INTELLIGENCE</title>
          <meta name="description" content="Secure login to ThreatWatch Intelligence Platform" />
        </Head>

        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            
            {/* Header */}
            <div className="text-center mb-8">
              <HolographicOverlay>
                <Shield className="h-16 w-16 text-cyber-blue mx-auto mb-4" />
              </HolographicOverlay>
              <h1 className="text-3xl md:text-4xl font-mono font-bold mb-2">
                <NeonText color="red" intensity="high">
                  THREATWATCH
                </NeonText>
              </h1>
              <p className="text-cyber-green/70 font-mono text-sm">
                INTELLIGENCE PLATFORM ACCESS
              </p>
            </div>

            {/* Login Form */}
            <CyberCard variant="glitch" className="p-6 md:p-8">
              <TerminalWindow title="SECURE LOGIN">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Email Field */}
                  <div>
                    <label className="block text-cyber-blue font-mono text-sm font-bold mb-2">
                      EMAIL ADDRESS
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-cyber-green/60" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                                 text-cyber-green font-mono text-sm
                                 focus:outline-none focus:ring-2 focus:ring-cyber-blue focus:border-transparent
                                 placeholder-cyber-green/40"
                        placeholder="Enter your email"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-cyber-blue font-mono text-sm font-bold mb-2">
                      PASSWORD
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-cyber-green/60" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                                 text-cyber-green font-mono text-sm
                                 focus:outline-none focus:ring-2 focus:ring-cyber-blue focus:border-transparent
                                 placeholder-cyber-green/40"
                        placeholder="Enter your password"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-cyber-green/60 hover:text-cyber-green transition-colors" />
                        ) : (
                          <Eye className="h-5 w-5 text-cyber-green/60 hover:text-cyber-green transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-cyber-dark/30 border border-cyber-red/30 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-cyber-red" />
                        <span className="text-cyber-red font-mono text-sm">{error}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <CyberButton
                    type="submit"
                    variant="cyber"
                    glowColor="blue"
                    className="w-full"
                    disabled={isLoading || !email || !password}
                  >
                    {isLoading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
                  </CyberButton>
                </form>
              </TerminalWindow>
            </CyberCard>

            {/* Footer */}
            <div className="text-center mt-6">
              <Link href="/" className="text-cyber-blue hover:text-cyber-green transition-colors font-mono text-sm">
                ← Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </HydrationSafe>
  );
}
