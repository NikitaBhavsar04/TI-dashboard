import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, Shield, User, LogOut, Settings, Home, FileText, Plus } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navLinks = [
    { href: '/', label: 'Home', icon: Home, show: true },
    { href: '/advisories', label: 'Advisories', icon: FileText, show: isAuthenticated },
    { href: '/admin', label: 'Admin', icon: Settings, show: isAdmin },
    { href: '/admin/upload', label: 'Upload', icon: Plus, show: isAdmin },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 nav-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center space-x-3 group transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 group-hover:from-neon-blue/30 group-hover:to-neon-purple/30 transition-all duration-300">
              <Shield className="w-6 h-6 text-neon-blue group-hover:drop-shadow-[0_0_8px_rgba(0,212,255,0.8)] transition-all duration-300" />
            </div>
            <span className="font-orbitron font-bold text-xl text-gradient-blue tracking-wider">
              EaglEye IntelDesk
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => 
              link.show && (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-rajdhani font-medium tracking-wide transition-all duration-300 group ${
                    router.pathname === link.href
                      ? 'text-neon-blue bg-neon-blue/10 shadow-neon-blue/20'
                      : 'text-slate-300 hover:text-neon-blue hover:bg-neon-blue/5'
                  }`}
                >
                  <link.icon className="w-4 h-4 group-hover:drop-shadow-[0_0_4px_rgba(0,212,255,0.6)] transition-all duration-300" />
                  <span>{link.label}</span>
                </Link>
              )
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {/* User Info */}
                <div className="flex items-center space-x-3 px-4 py-2 rounded-lg glass-card">
                  <div className="p-1.5 rounded-full bg-gradient-to-br from-neon-purple/20 to-neon-pink/20">
                    <User className="w-4 h-4 text-neon-purple" />
                  </div>
                  <div className="text-sm">
                    <div className="font-rajdhani font-medium text-slate-200">{user?.username}</div>
                    <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg btn-neon-pink group"
                >
                  <LogOut className="w-4 h-4 group-hover:drop-shadow-[0_0_4px_rgba(236,72,153,0.6)] transition-all duration-300" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="btn-neon flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg glass-card hover-glow transition-all duration-300"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-neon-blue" />
            ) : (
              <Menu className="w-6 h-6 text-neon-blue" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2 animate-fade-in-up">
            <div className="glass-card p-4 space-y-3">
              {navLinks.map((link) => 
                link.show && (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-rajdhani font-medium transition-all duration-300 ${
                      router.pathname === link.href
                        ? 'text-neon-blue bg-neon-blue/10'
                        : 'text-slate-300 hover:text-neon-blue hover:bg-neon-blue/5'
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </Link>
                )
              )}
              
              {isAuthenticated ? (
                <div className="pt-3 border-t border-slate-700/50 space-y-3">
                  <div className="flex items-center space-x-3 px-4 py-2">
                    <div className="p-1.5 rounded-full bg-gradient-to-br from-neon-purple/20 to-neon-pink/20">
                      <User className="w-4 h-4 text-neon-purple" />
                    </div>
                    <div>
                      <div className="font-rajdhani font-medium text-slate-200">{user?.username}</div>
                      <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg btn-neon-pink"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg btn-neon"
                >
                  <User className="w-5 h-5" />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
