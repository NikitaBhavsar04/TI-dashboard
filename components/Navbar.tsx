import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Upload, Search, User, LogOut, Settings, Home } from 'lucide-react';
import { CyberButton, CyberBadge } from '@/components/ui/cyber-components';

export default function Navbar() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();

  return (
    <nav className="bg-cyber-dark text-white shadow-lg border-b border-cyber-blue/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center">
            <Link href={isAuthenticated ? "/advisories" : "/"} className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-cyber-blue" />
              <span className="font-mono font-bold text-xl text-cyber-green">
                ThreatWatch
              </span>
            </Link>
          </div>
          
          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            
            {/* Public/Common Links */}
            <Link 
              href="/advisories" 
              className="flex items-center space-x-1 text-cyber-green/80 hover:text-cyber-blue transition-colors font-mono text-sm"
            >
              <Search className="h-4 w-4" />
              <span>Advisories</span>
            </Link>

            {/* Authenticated User Links */}
            {isAuthenticated ? (
              <>
                {/* Admin Only Links */}
                {isAdmin && (
                  <>
                    <Link 
                      href="/admin" 
                      className="flex items-center space-x-1 text-cyber-green/80 hover:text-cyber-purple transition-colors font-mono text-sm"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                    
                    <Link 
                      href="/admin/upload" 
                      className="flex items-center space-x-1 text-cyber-green/80 hover:text-cyber-blue transition-colors font-mono text-sm"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Create</span>
                    </Link>
                  </>
                )}

                {/* User Info and Actions */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-cyber-green/60" />
                    <span className="text-cyber-green font-mono text-sm">
                      {user?.username}
                    </span>
                    <CyberBadge 
                      variant={isAdmin ? 'danger' : 'info'} 
                      className="text-xs"
                    >
                      {user?.role?.toUpperCase()}
                    </CyberBadge>
                  </div>
                  
                  <CyberButton
                    variant="ghost"
                    glowColor="red"
                    onClick={logout}
                    className="text-xs"
                  >
                    <LogOut className="h-4 w-4" />
                  </CyberButton>
                </div>
              </>
            ) : (
              /* Non-authenticated Links */
              <>
                <Link 
                  href="/" 
                  className="flex items-center space-x-1 text-cyber-green/80 hover:text-cyber-blue transition-colors font-mono text-sm"
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>
                
                <Link href="/login">
                  <CyberButton variant="cyber" glowColor="blue" className="text-sm">
                    <User className="h-4 w-4 mr-1" />
                    Login
                  </CyberButton>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
