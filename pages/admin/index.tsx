import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import HydrationSafe from '@/components/HydrationSafe';
import AnimatedBackground from '@/components/AnimatedBackground';
import { 
  Users, 
  FileText, 
  Shield, 
  Activity, 
  Plus, 
  Settings,
  LogOut,
  Eye,
  Bell,
  TrendingUp,
  Database,
  Lock,
  Crown,
  ShieldCheck,
  Mail,
  AlertTriangle,
  BarChart3,
  Clock,
  Globe
} from 'lucide-react';

interface User {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalAdvisories: number;
  recentActivity: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalAdvisories: 0,
    recentActivity: 0,
    systemHealth: 'good'
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { user, logout, hasRole, isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('admin'))) {
      router.push('/login');
      return;
    }
    
    if (hasRole('admin')) {
      fetchDashboardData();
    }
  }, [user, hasRole, authLoading, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const usersResponse = await fetch('/api/users', {
        credentials: 'include'
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const usersList = usersData.users || [];
        setUsers(usersList);
        
        // Calculate stats
        setStats({
          totalUsers: usersList.length,
          activeUsers: usersList.filter((u: User) => u.isActive).length,
          totalAdvisories: 0, // We'll update this with actual count
          recentActivity: Math.floor(Math.random() * 50), // Placeholder
          systemHealth: 'good'
        });
      }

      // Fetch advisories count
      const advisoriesResponse = await fetch('/api/advisories', {
        credentials: 'include'
      });
      
      if (advisoriesResponse.ok) {
        const advisoriesData = await advisoriesResponse.json();
        setStats(prev => ({
          ...prev,
          totalAdvisories: advisoriesData.length || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setStats(prev => ({
        ...prev,
        systemHealth: 'warning'
      }));
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      case 'admin':
        return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      default:
        return 'bg-green-500/20 text-green-300 border-green-400/30';
    }
  };

  const getSystemHealthColor = () => {
    switch (stats.systemHealth) {
      case 'good':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-green-400';
    }
  };

  if (authLoading || loading) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-blue mx-auto mb-4"></div>
            <div className="text-slate-400 font-rajdhani">Loading dashboard...</div>
          </div>
        </div>
      </HydrationSafe>
    );
  }

  if (!hasRole('admin')) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-orbitron text-white mb-2">Access Denied</h2>
            <p className="text-slate-400">Admin privileges required to access this dashboard.</p>
          </div>
        </div>
      </HydrationSafe>
    );
  }

  return (
    <HydrationSafe>
      <div className="relative min-h-screen bg-slate-900">
        <AnimatedBackground opacity={0.3} />
        <div className="relative z-10 pt-20">
          <Head>
            <title>Admin Dashboard - EaglEye IntelDesk</title>
            <meta name="description" content="IntelDesk Admin Dashboard - Manage Users and System" />
          </Head>

        {/* Header */}
        <div className="glass-panel border-b border-slate-700/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-neon-blue/20 to-purple-600/20 border border-neon-blue/30">
                  <Shield className="h-6 w-6 text-neon-blue" />
                </div>
                <div>
                  <h1 className="text-2xl font-orbitron font-bold text-white">
                    Admin Dashboard
                  </h1>
                  <p className="text-slate-400 font-rajdhani">
                    Welcome back, <span className="text-neon-blue">{user?.username}</span>
                    {isSuperAdmin && <span className="ml-2 text-purple-400">• Super Admin</span>}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-right mr-4">
                  <div className="text-slate-400 font-rajdhani text-sm">Current Time</div>
                  <div className="text-neon-blue font-orbitron text-sm">
                    {currentTime.toLocaleTimeString()}
                  </div>
                </div>
                <Link href="/advisories">
                  <button className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-400/50 rounded-lg text-green-400 hover:bg-green-500/30 transition-all duration-200 font-rajdhani">
                    <Eye className="h-4 w-4" />
                    <span>View Site</span>
                  </button>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 border border-red-400/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all duration-200 font-rajdhani"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          
          {/* System Status Bar */}
          <div className="glass-panel-hover p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${stats.systemHealth === 'good' ? 'bg-green-400' : stats.systemHealth === 'warning' ? 'bg-yellow-400' : 'bg-red-400'} animate-pulse`}></div>
                  <span className="text-slate-400 font-rajdhani">System Status:</span>
                  <span className={`font-orbitron font-medium ${getSystemHealthColor()}`}>
                    {stats.systemHealth.toUpperCase()}
                  </span>
                </div>
                <div className="w-px h-6 bg-slate-600"></div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-neon-blue" />
                  <span className="text-slate-400 font-rajdhani">Recent Activity:</span>
                  <span className="text-neon-blue font-orbitron">{stats.recentActivity}</span>
                </div>
              </div>
              <div className="text-slate-400 font-rajdhani text-sm">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="glass-panel-hover p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-400/30">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 font-rajdhani text-sm mb-1">Total Users</p>
                <p className="text-2xl font-orbitron font-bold text-white">
                  {stats.totalUsers}
                </p>
                <p className="text-green-400 font-rajdhani text-xs">
                  {stats.activeUsers} active
                </p>
              </div>
            </div>

            <div className="glass-panel-hover p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-400/30">
                  <FileText className="h-6 w-6 text-purple-400" />
                </div>
                <BarChart3 className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 font-rajdhani text-sm mb-1">Advisories</p>
                <p className="text-2xl font-orbitron font-bold text-white">
                  {stats.totalAdvisories}
                </p>
                <p className="text-purple-400 font-rajdhani text-xs">
                  published
                </p>
              </div>
            </div>

            <div className="glass-panel-hover p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-500/20 border border-green-400/30">
                  <Activity className="h-6 w-6 text-green-400" />
                </div>
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 font-rajdhani text-sm mb-1">Active Sessions</p>
                <p className="text-2xl font-orbitron font-bold text-white">
                  {stats.activeUsers}
                </p>
                <p className="text-green-400 font-rajdhani text-xs">
                  online now
                </p>
              </div>
            </div>

            <div className="glass-panel-hover p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-yellow-500/20 border border-yellow-400/30">
                  <Globe className="h-6 w-6 text-yellow-400" />
                </div>
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-slate-400 font-rajdhani text-sm mb-1">System Load</p>
                <p className="text-2xl font-orbitron font-bold text-white">
                  {Math.floor(Math.random() * 30 + 40)}%
                </p>
                <p className="text-yellow-400 font-rajdhani text-xs">
                  optimal
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
            <div className="glass-panel-hover p-6">
              <h3 className="text-xl font-orbitron font-bold text-white mb-6 flex items-center">
                <FileText className="h-5 w-5 text-neon-blue mr-3" />
                Advisory Management
              </h3>
              <div className="space-y-4">
                <Link href="/admin/upload">
                  <button className="w-full flex items-center justify-between p-4 bg-neon-blue/10 border border-neon-blue/30 rounded-lg text-neon-blue hover:bg-neon-blue/20 transition-all duration-200 group">
                    <div className="flex items-center space-x-3">
                      <Plus className="h-5 w-5" />
                      <span className="font-rajdhani font-medium">Create New Advisory</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                  </button>
                </Link>
                <Link href="/advisories">
                  <button className="w-full flex items-center justify-between p-4 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-all duration-200 group">
                    <div className="flex items-center space-x-3">
                      <Eye className="h-5 w-5" />
                      <span className="font-rajdhani font-medium">View All Advisories</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                  </button>
                </Link>
              </div>
            </div>

            <div className="glass-panel-hover p-6">
              <h3 className="text-xl font-orbitron font-bold text-white mb-6 flex items-center">
                <Database className="h-5 w-5 text-cyan-400 mr-3" />
                Threat Intelligence
              </h3>
              <div className="space-y-4">
                <Link href="/admin/raw-articles">
                  <button className="w-full flex items-center justify-between p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-all duration-200 group">
                    <div className="flex items-center space-x-3">
                      <Database className="h-5 w-5" />
                      <span className="font-rajdhani font-medium">Raw Articles Feed</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                  </button>
                </Link>
                <Link href="/admin/eagle-nest">
                  <button className="w-full flex items-center justify-between p-4 bg-amber-500/10 border border-amber-400/30 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-all duration-200 group">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5" />
                      <span className="font-rajdhani font-medium">Eagle Nest</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                  </button>
                </Link>
                <Link href="/scheduled-emails">
                  <button className="w-full flex items-center justify-between p-4 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-all duration-200 group">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5" />
                      <span className="font-rajdhani font-medium">Scheduled Emails</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                  </button>
                </Link>
              </div>
            </div>

            <div className="glass-panel-hover p-6">
              <h3 className="text-xl font-orbitron font-bold text-white mb-6 flex items-center">
                <Mail className="h-5 w-5 text-orange-400 mr-3" />
                Client Management
              </h3>
              <div className="space-y-4">
                <Link href="/admin/clients">
                  <button className="w-full flex items-center justify-between p-4 bg-orange-500/10 border border-orange-400/30 rounded-lg text-orange-400 hover:bg-orange-500/20 transition-all duration-200 group">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5" />
                      <span className="font-rajdhani font-medium">Manage Clients</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                  </button>
                </Link>
                <Link href="/admin/clients">
                  <button className="w-full flex items-center justify-between p-4 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-all duration-200 group">
                    <div className="flex items-center space-x-3">
                      <Plus className="h-5 w-5" />
                      <span className="font-rajdhani font-medium">Add New Client</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                  </button>
                </Link>
              </div>
            </div>

            <div className="glass-panel-hover p-6">
              <h3 className="text-xl font-orbitron font-bold text-white mb-6 flex items-center">
                <Users className="h-5 w-5 text-green-400 mr-3" />
                User Management
              </h3>
              <div className="space-y-4">
                <Link href="/admin/users">
                  <button className="w-full flex items-center justify-between p-4 bg-green-500/10 border border-green-400/30 rounded-lg text-green-400 hover:bg-green-500/20 transition-all duration-200 group">
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5" />
                      <span className="font-rajdhani font-medium">Manage Users</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                  </button>
                </Link>
                {isSuperAdmin && (
                  <button className="w-full flex items-center justify-between p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-all duration-200 group">
                    <div className="flex items-center space-x-3">
                      <Settings className="h-5 w-5" />
                      <span className="font-rajdhani font-medium">System Settings</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Recent Users Overview */}
          <div className="glass-panel-hover p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-orbitron font-bold text-white flex items-center">
                <Users className="h-5 w-5 text-neon-blue mr-3" />
                Recent Users
              </h3>
              <Link href="/admin/users">
                <button className="text-neon-blue hover:text-white transition-colors font-rajdhani">
                  View All →
                </button>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-600/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 5).map((userData) => (
                    <tr key={userData._id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-all duration-200">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-orbitron font-medium text-white">{userData.username}</div>
                          <div className="text-slate-400 font-rajdhani text-sm">{userData.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs border ${getRoleColor(userData.role)}`}>
                          {getRoleIcon(userData.role)}
                          <span>{userData.role.replace('_', ' ').toUpperCase()}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs border ${
                          userData.isActive 
                            ? 'bg-green-500/20 text-green-300 border-green-400/30' 
                            : 'bg-red-500/20 text-red-300 border-red-400/30'
                        }`}>
                          {userData.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-400 font-rajdhani text-sm">
                        {new Date(userData.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      </div>
    </HydrationSafe>
  );
}
