import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Shield, User, Settings, LogOut, Menu, X, Activity, Clock, Home } from 'lucide-react';

function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-cyan-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={isAuthenticated ? "/advisories" : "/"} className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-cyan-400" />
            <span className="font-orbitron font-bold text-lg text-white">THREATWATCH</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 px-4 py-2 text-white">
              <Home className="h-5 w-5 text-cyan-400" />
              <span>HOME</span>
            </Link>
            
            <Link href="/advisories" className="flex items-center gap-2 px-4 py-2 text-white">
              <Activity className="h-5 w-5 text-cyan-400" />
              <span>INTEL FEED</span>
            </Link>

            {isAuthenticated && isAdmin && (
              <>
                <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-purple-300">
                  <Settings className="h-4 w-4" />
                  <span>ADMIN</span>
                </Link>

                {/* Live Timestamp */}
                <div className="flex items-center gap-2 px-4 py-2 bg-green-900/50 border border-green-400/70 rounded-lg">
                  <Clock className="h-5 w-5 text-green-400" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-green-400">LIVE</span>
                    <span className="text-sm text-white">{formatTime(currentTime)}</span>
                  </div>
                </div>
              </>
            )}

            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2 text-white">
                  <User className="h-4 w-4 text-blue-400" />
                  <span>{user?.username?.toUpperCase() || 'USER'}</span>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-red-300">
                  <LogOut className="h-4 w-4" />
                  <span>LOGOUT</span>
                </button>
              </>
            ) : (
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-white">
                <User className="h-4 w-4" />
                <span>LOGIN</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 mt-2 mx-4 bg-slate-900/90 rounded-xl border border-white/10 p-4 space-y-3">
            <Link href="/" className="flex items-center gap-3 p-3 text-white" onClick={() => setIsMenuOpen(false)}>
              <Home className="h-5 w-5 text-cyan-400" />
              <span>HOME</span>
            </Link>
            
            <Link href="/advisories" className="flex items-center gap-3 p-3 text-white" onClick={() => setIsMenuOpen(false)}>
              <Activity className="h-5 w-5 text-cyan-400" />
              <span>INTEL FEED</span>
            </Link>

            {isAuthenticated && isAdmin && (
              <>
                <div className="flex items-center gap-3 p-3 bg-green-900/50 border border-green-500/50 rounded-lg">
                  <Clock className="h-5 w-5 text-green-400" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-green-400">LIVE</span>
                    <span className="text-xs text-white">{formatTime(currentTime)}</span>
                  </div>
                </div>
                <Link href="/admin" className="flex items-center gap-3 p-3 text-white" onClick={() => setIsMenuOpen(false)}>
                  <Settings className="h-5 w-5 text-purple-400" />
                  <span>ADMIN PANEL</span>
                </Link>
              </>
            )}

            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 p-3 border-t border-white/10">
                  <User className="h-5 w-5 text-blue-400" />
                  <span className="text-white">{user?.username?.toUpperCase() || 'USER'}</span>
                </div>
                <button 
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 p-3 text-red-300"
                >
                  <LogOut className="h-5 w-5" />
                  <span>LOGOUT</span>
                </button>
              </>
            ) : (
              <Link href="/login" className="flex items-center justify-center gap-2 p-3 text-white" onClick={() => setIsMenuOpen(false)}>
                <User className="h-5 w-5" />
                <span>LOGIN</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
