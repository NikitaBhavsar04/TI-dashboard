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
      {/* Glass navbar background */}
      <div className="absolute inset-0 bg-glass-gradient border-b border-white/10"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 group-hover:bg-neon-blue/20 transition-all duration-300">
              <Shield className="h-6 w-6 text-neon-blue" />
            </div>
            <div className="flex flex-col">
              <span className="font-orbitron font-bold text-lg text-white group-hover:text-neon-blue transition-colors duration-300">
                EaglEye IntelDesk
              </span>
              <span className="font-rajdhani text-xs text-white/60 -mt-1">
                INTELLIGENCE PLATFORM
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {/* Public Links */}

            {isAuthenticated ? (
              <>
                {/* Admin Links */}
                {isAdmin && (
                  <>
                    <Link 
                      href="/admin" 
                      className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-glass-100 border border-white/10 hover:border-neon-purple/30 hover:bg-neon-purple/10 transition-all duration-300 font-rajdhani font-medium text-white/90 hover:text-neon-purple"
                    >
                      <Settings className="h-4 w-4 group-hover:text-neon-purple transition-colors duration-300" />
                      ADMIN
                    </Link>
                    <Link 
                      href="/admin/upload" 
                      className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-glass-100 border border-white/10 hover:border-neon-pink/30 hover:bg-neon-pink/10 transition-all duration-300 font-rajdhani font-medium text-white/90 hover:text-neon-pink"
                    >
                      <Upload className="h-4 w-4 group-hover:text-neon-pink transition-colors duration-300" />
                      UPLOAD
                    </Link>
                  </>
                )}

                {/* User Info */}
                <div className="flex items-center gap-3 ml-4 px-4 py-2 rounded-lg bg-glass-200 border border-white/20">
                  <div className="p-1.5 rounded-full bg-neon-blue/20 border border-neon-blue/30">
                    <User className="h-4 w-4 text-neon-blue" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-rajdhani font-semibold text-white">
                      {user?.username?.toUpperCase() || 'ANALYST'}
                    </span>
                    <span className={`text-xs font-orbitron font-bold ${
                      isAdmin ? 'text-neon-pink' : 'text-neon-cyan'
                    }`}>
                      {user?.role?.toUpperCase() || 'USER'}
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <button 
                  onClick={handleLogout}
                  className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-glass-100 border border-white/10 hover:border-red-400/50 hover:bg-red-500/10 transition-all duration-300 font-rajdhani font-medium text-white/90 hover:text-red-400"
                >
                  <LogOut className="h-4 w-4 group-hover:text-red-400 transition-colors duration-300" />
                  LOGOUT
                </button>
              </>
            ) : (
              <Link 
                href="/login" 
                className="group flex items-center gap-2 px-6 py-2 rounded-lg bg-button-gradient border border-neon-blue/30 hover:shadow-button-glow-hover transition-all duration-300 font-rajdhani font-semibold text-white"
              >
                <User className="h-4 w-4" />
                LOGIN
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg bg-glass-100 border border-white/10 hover:border-neon-blue/30 hover:bg-neon-blue/10 transition-all duration-300"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 mt-2 mx-4">
            <div className="bg-glass-gradient backdrop-blur-glass rounded-xl border border-white/10 shadow-glass p-4 space-y-3">

              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <>
                      <Link 
                        href="/admin" 
                        className="flex items-center gap-3 p-3 rounded-lg bg-glass-100 border border-white/10 hover:border-neon-purple/30 hover:bg-neon-purple/10 transition-all duration-300 font-rajdhani font-medium text-white"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Settings className="h-5 w-5 text-neon-purple" />
                        ADMIN PANEL
                      </Link>
                      <Link 
                        href="/admin/upload" 
                        className="flex items-center gap-3 p-3 rounded-lg bg-glass-100 border border-white/10 hover:border-neon-pink/30 hover:bg-neon-pink/10 transition-all duration-300 font-rajdhani font-medium text-white"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Upload className="h-5 w-5 text-neon-pink" />
                        UPLOAD INTEL
                      </Link>
                    </>
                  )}
                  
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center gap-3 p-3 bg-glass-200 rounded-lg border border-white/20">
                      <div className="p-2 rounded-full bg-neon-blue/20 border border-neon-blue/30">
                        <User className="h-5 w-5 text-neon-blue" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-rajdhani font-semibold text-white">
                          {user?.username?.toUpperCase() || 'ANALYST'}
                        </span>
                        <span className={`text-xs font-orbitron font-bold ${
                          isAdmin ? 'text-neon-pink' : 'text-neon-cyan'
                        }`}>
                          {user?.role?.toUpperCase() || 'USER'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full mt-3 flex items-center justify-center gap-2 p-3 rounded-lg bg-glass-100 border border-white/10 hover:border-red-400/50 hover:bg-red-500/10 transition-all duration-300 font-rajdhani font-medium text-white hover:text-red-400"
                    >
                      <LogOut className="h-5 w-5" />
                      LOGOUT
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    href="/" 
                    className="flex items-center gap-3 p-3 rounded-lg bg-glass-100 border border-white/10 hover:border-neon-blue/30 hover:bg-neon-blue/10 transition-all duration-300 font-rajdhani font-medium text-white"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Home className="h-5 w-5 text-neon-blue" />
                    DASHBOARD
                  </Link>
                  <Link 
                    href="/login" 
                    className="flex items-center justify-center gap-2 p-3 rounded-lg bg-button-gradient border border-neon-blue/30 hover:shadow-button-glow transition-all duration-300 font-rajdhani font-semibold text-white"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    LOGIN
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
