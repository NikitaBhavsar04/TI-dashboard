import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { 
  Shield, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Home,
  Database,
  Upload,
  Activity,
  Users
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-glass">
      {/* Glass Background */}
      <div className="absolute inset-0 bg-glass-gradient border-b border-white/10"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 group-hover:bg-neon-blue/20 transition-all duration-300">
              <Shield className="h-6 w-6 text-neon-blue" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-orbitron font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                THREAT INTEL
              </h1>
              <p className="text-xs text-gray-400 font-rajdhani tracking-wider">COMMAND CENTER</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              href="/advisories" 
              className={`group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
                router.pathname === '/advisories' 
                  ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20' 
                  : 'text-gray-300 hover:text-neon-blue hover:bg-neon-blue/5'
              }`}
            >
              <Activity className="h-4 w-4" />
              INTEL FEED
            </Link>

            {isAuthenticated && isAdmin && (
              <>
                <Link 
                  href="/admin" 
                  className={`group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
                    router.pathname === '/admin' 
                      ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/20' 
                      : 'text-gray-300 hover:text-neon-purple hover:bg-neon-purple/5'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  ADMIN
                </Link>
                <Link 
                  href="/admin/upload" 
                  className={`group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
                    router.pathname === '/admin/upload' 
                      ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' 
                      : 'text-gray-300 hover:text-neon-cyan hover:bg-neon-cyan/5'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  UPLOAD
                </Link>


              </>
            )}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-glass-dark border border-white/10">
                  <div className="p-1 rounded-full bg-neon-blue/20">
                    <User className="h-4 w-4 text-neon-blue" />
                  </div>
                  <div className="text-sm">
                    <p className="text-white font-medium">{user?.email}</p>
                    <p className="text-xs text-gray-400">
                      {isAdmin ? 'Administrator' : 'Analyst'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 font-medium text-gray-300 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                >
                  <LogOut className="h-4 w-4" />
                  LOGOUT
                </button>
              </>
            ) : (
              <Link 
                href="/login" 
                className="group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 font-medium text-gray-300 hover:text-neon-blue hover:bg-neon-blue/10 border border-transparent hover:border-neon-blue/20"
              >
                <User className="h-4 w-4" />
                LOGIN
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-glass-dark hover:text-neon-blue transition-all duration-300"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 bg-glass-dark backdrop-blur-xl">
            <div className="flex flex-col gap-2">
              <Link 
                href="/advisories" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-neon-blue/10 hover:text-neon-blue transition-all duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                <Activity className="h-5 w-5" />
                INTEL FEED
              </Link>
              
              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <>
                      <Link 
                        href="/admin" 
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-neon-purple/10 hover:text-neon-purple transition-all duration-300"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Settings className="h-5 w-5" />
                        ADMIN PANEL
                      </Link>
                      <Link 
                        href="/admin/upload" 
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-neon-cyan/10 hover:text-neon-cyan transition-all duration-300"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Upload className="h-5 w-5" />
                        UPLOAD THREAT
                      </Link>
                    </>
                  )}
                  
                  <div className="px-4 py-3 border-t border-white/10 mt-2">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-1 rounded-full bg-neon-blue/20">
                        <User className="h-4 w-4 text-neon-blue" />
                      </div>
                      <div className="text-sm">
                        <p className="text-white font-medium">{user?.email}</p>
                        <p className="text-xs text-gray-400">
                          {isAdmin ? 'Administrator' : 'Analyst'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
                    >
                      <LogOut className="h-5 w-5" />
                      LOGOUT
                    </button>
                  </div>
                </>
              ) : (
                <Link 
                  href="/login" 
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-neon-blue/10 hover:text-neon-blue transition-all duration-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  SECURE LOGIN
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
