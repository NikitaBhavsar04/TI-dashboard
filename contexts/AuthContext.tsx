import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  lastLogin?: Date;
  createdAt?: Date;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  hasRole: (requiredRole: 'user' | 'admin' | 'super_admin') => boolean;
  canManageUsers: () => boolean;
  canViewEmails: () => boolean;
  canCreateRole: (targetRole: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      setUser(data.user);
      
      // Store token in localStorage as backup
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      // Redirect based on role
      if (data.user.role === 'super_admin' || data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/admin/eagle-nest');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear localStorage
      localStorage.removeItem('token');
      setUser(null);
      router.push('/login');
    }
  };

  const hasRole = (requiredRole: 'user' | 'admin' | 'super_admin'): boolean => {
    if (!user) return false;
    
    const roleHierarchy = {
      super_admin: 3,
      admin: 2,
      user: 1
    };

    const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  };

  const canManageUsers = (): boolean => {
    return hasRole('admin'); // Both admin and super_admin can manage users
  };

  const canViewEmails = (): boolean => {
    return user?.role === 'super_admin'; // Only super_admin can see email addresses
  };

  const canCreateRole = (targetRole: string): boolean => {
    if (!user) return false;
    
    if (user.role === 'super_admin') {
      return ['user', 'admin', 'super_admin'].includes(targetRole);
    }
    
    if (user.role === 'admin') {
      return targetRole === 'user';
    }
    
    return false;
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    isAuthenticated: !!user,
    hasRole,
    canManageUsers,
    canViewEmails,
    canCreateRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
