import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { CyberCard, CyberButton, CyberBadge } from '@/components/ui/cyber-components';
import { HolographicOverlay, NeonText, TerminalWindow } from '@/components/ui/cyber-effects';
import HydrationSafe from '@/components/HydrationSafe';
import { 
  Users, 
  FileText, 
  Shield, 
  Activity, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus,
  Settings,
  LogOut,
  Calendar,
  Eye
} from 'lucide-react';

interface User {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [advisoryCount, setAdvisoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  });
  const [error, setError] = useState('');

  const { user, logout, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/login');
      return;
    }
    
    if (isAdmin) {
      fetchDashboardData();
    }
  }, [user, isAdmin, authLoading, router]);

  const fetchDashboardData = async () => {
    try {
      // Fetch users
      const usersResponse = await fetch('/api/users', {
        credentials: 'include'
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users);
      }

      // Fetch advisories count
      const advisoriesResponse = await fetch('/api/advisories', {
        credentials: 'include'
      });
      
      if (advisoriesResponse.ok) {
        const advisoriesData = await advisoriesResponse.json();
        setAdvisoryCount(advisoriesData.length);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      setNewUser({ username: '', email: '', password: '', role: 'user' });
      setShowCreateUser(false);
      fetchDashboardData(); // Refresh data
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, isActive: !isActive }),
        credentials: 'include'
      });

      if (response.ok) {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId }),
        credentials: 'include'
      });

      if (response.ok) {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
          <div className="text-cyber-green font-mono">Loading...</div>
        </div>
      </HydrationSafe>
    );
  }

  if (!isAdmin) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
          <div className="text-cyber-red font-mono">Access Denied</div>
        </div>
      </HydrationSafe>
    );
  }

  return (
    <HydrationSafe>
      <div className="min-h-screen bg-cyber-dark">
        <Head>
          <title>Admin Dashboard - EaglEye IntelDesk INTELLIGENCE</title>
          <meta name="description" content="ThreatWatch Intelligence Platform Admin Dashboard" />
        </Head>

        {/* Header */}
        <div className="border-b border-cyber-blue/30 bg-cyber-dark/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <HolographicOverlay>
                  <Shield className="h-8 w-8 text-cyber-blue" />
                </HolographicOverlay>
                <div>
                  <h1 className="text-2xl font-mono font-bold">
                    <NeonText color="blue" intensity="high">
                      ADMIN DASHBOARD
                    </NeonText>
                  </h1>
                  <p className="text-cyber-green/70 font-mono text-sm">
                    Welcome back, {user?.username}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Link href="/advisories">
                  <CyberButton variant="ghost" glowColor="green">
                    <Eye className="h-4 w-4 mr-2" />
                    View Site
                  </CyberButton>
                </Link>
                <CyberButton variant="ghost" glowColor="red" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </CyberButton>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <CyberCard variant="matrix" className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-cyber-blue mr-4" />
                <div>
                  <p className="text-cyber-green/70 font-mono text-sm">Total Users</p>
                  <p className="text-2xl font-mono font-bold text-cyber-green">
                    {users.length}
                  </p>
                </div>
              </div>
            </CyberCard>

            <CyberCard variant="matrix" className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-cyber-purple mr-4" />
                <div>
                  <p className="text-cyber-green/70 font-mono text-sm">Advisories</p>
                  <p className="text-2xl font-mono font-bold text-cyber-green">
                    {advisoryCount}
                  </p>
                </div>
              </div>
            </CyberCard>

            <CyberCard variant="matrix" className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-cyber-red mr-4" />
                <div>
                  <p className="text-cyber-green/70 font-mono text-sm">Active Users</p>
                  <p className="text-2xl font-mono font-bold text-cyber-green">
                    {users.filter(u => u.isActive).length}
                  </p>
                </div>
              </div>
            </CyberCard>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <CyberCard variant="neon" glowColor="blue" className="p-6">
              <h3 className="text-lg font-mono font-bold text-cyber-blue mb-4">
                ADVISORY MANAGEMENT
              </h3>
              <div className="space-y-3">
                <Link href="/admin/upload">
                  <CyberButton variant="cyber" glowColor="blue" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Advisory
                  </CyberButton>
                </Link>
                <Link href="/advisories">
                  <CyberButton variant="ghost" glowColor="blue" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    View All Advisories
                  </CyberButton>
                </Link>
              </div>
            </CyberCard>

            <CyberCard variant="neon" glowColor="green" className="p-6">
              <h3 className="text-lg font-mono font-bold text-cyber-green mb-4">
                USER MANAGEMENT
              </h3>
              <div className="space-y-3">
                <CyberButton 
                  variant="cyber" 
                  glowColor="green" 
                  className="w-full"
                  onClick={() => setShowCreateUser(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New User
                </CyberButton>
                <CyberButton variant="ghost" glowColor="green" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Permissions
                </CyberButton>
              </div>
            </CyberCard>
          </div>

          {/* Users Table */}
          <CyberCard variant="holographic" className="p-6">
            <TerminalWindow title="USER MANAGEMENT">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-mono font-bold text-cyber-blue">
                    REGISTERED USERS
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-cyber-blue/30">
                        <th className="text-left py-3 px-4 font-mono text-cyber-blue text-sm">USERNAME</th>
                        <th className="text-left py-3 px-4 font-mono text-cyber-blue text-sm">EMAIL</th>
                        <th className="text-left py-3 px-4 font-mono text-cyber-blue text-sm">ROLE</th>
                        <th className="text-left py-3 px-4 font-mono text-cyber-blue text-sm">STATUS</th>
                        <th className="text-left py-3 px-4 font-mono text-cyber-blue text-sm">CREATED</th>
                        <th className="text-left py-3 px-4 font-mono text-cyber-blue text-sm">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((userData) => (
                        <tr key={userData._id} className="border-b border-cyber-blue/10">
                          <td className="py-3 px-4 font-mono text-cyber-green text-sm">
                            {userData.username}
                          </td>
                          <td className="py-3 px-4 font-mono text-cyber-green text-sm">
                            {userData.email}
                          </td>
                          <td className="py-3 px-4">
                            <CyberBadge variant={userData.role === 'admin' ? 'danger' : 'info'}>
                              {userData.role.toUpperCase()}
                            </CyberBadge>
                          </td>
                          <td className="py-3 px-4">
                            <CyberBadge variant={userData.isActive ? 'success' : 'warning'}>
                              {userData.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </CyberBadge>
                          </td>
                          <td className="py-3 px-4 font-mono text-cyber-green text-sm">
                            {new Date(userData.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <CyberButton
                                variant="ghost"
                                glowColor={userData.isActive ? 'orange' : 'green'}
                                onClick={() => handleToggleUserStatus(userData._id, userData.isActive)}
                                className="text-xs"
                              >
                                {userData.isActive ? 'Deactivate' : 'Activate'}
                              </CyberButton>
                              {userData._id !== user?.id && (
                                <CyberButton
                                  variant="ghost"
                                  glowColor="red"
                                  onClick={() => handleDeleteUser(userData._id)}
                                  className="text-xs"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </CyberButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TerminalWindow>
          </CyberCard>

          {/* Create User Modal */}
          {showCreateUser && (
            <div className="fixed inset-0 bg-cyber-dark/80 backdrop-blur-sm flex items-center justify-center z-50">
              <CyberCard variant="glitch" className="p-6 w-full max-w-md mx-4">
                <TerminalWindow title="CREATE NEW USER">
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    {error && (
                      <div className="text-cyber-red font-mono text-sm">{error}</div>
                    )}
                    
                    <div>
                      <label className="block text-cyber-blue font-mono text-sm mb-2">
                        USERNAME
                      </label>
                      <input
                        type="text"
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                        className="w-full px-3 py-2 bg-cyber-dark border border-cyber-blue/30 rounded 
                                 text-cyber-green font-mono text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-cyber-blue font-mono text-sm mb-2">
                        EMAIL
                      </label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        className="w-full px-3 py-2 bg-cyber-dark border border-cyber-blue/30 rounded 
                                 text-cyber-green font-mono text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-cyber-blue font-mono text-sm mb-2">
                        PASSWORD
                      </label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        className="w-full px-3 py-2 bg-cyber-dark border border-cyber-blue/30 rounded 
                                 text-cyber-green font-mono text-sm"
                        required
                        minLength={6}
                      />
                    </div>

                    <div>
                      <label className="block text-cyber-blue font-mono text-sm mb-2">
                        ROLE
                      </label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value as 'admin' | 'user'})}
                        className="w-full px-3 py-2 bg-cyber-dark border border-cyber-blue/30 rounded 
                                 text-cyber-green font-mono text-sm"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex space-x-3">
                      <CyberButton type="submit" variant="cyber" glowColor="green" className="flex-1">
                        Create User
                      </CyberButton>
                      <CyberButton 
                        type="button" 
                        variant="ghost" 
                        glowColor="red" 
                        onClick={() => setShowCreateUser(false)}
                        className="flex-1"
                      >
                        Cancel
                      </CyberButton>
                    </div>
                  </form>
                </TerminalWindow>
              </CyberCard>
            </div>
          )}
        </div>
      </div>
    </HydrationSafe>
  );
}
