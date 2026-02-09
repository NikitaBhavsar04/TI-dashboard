import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { SkeletonStatsCard } from '@/components/Skeleton';
import HydrationSafe from '@/components/HydrationSafe';
import LoadingLogo from '@/components/LoadingLogo';
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
  Globe,
  Briefcase,
  Rss
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

      // Fetch Eagle Nest advisories count
      const eagleNestResponse = await fetch('/api/eagle-nest', {
        credentials: 'include'
      });
      
      if (eagleNestResponse.ok) {
        const eagleNestData = await eagleNestResponse.json();
        setStats(prev => ({
          ...prev,
          totalAdvisories: eagleNestData.advisories?.length || 0
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
        return 'bg-red-500/20 text-red-300 border-red-400/30';
      case 'admin':
        return 'bg-orange-500/20 text-orange-300 border-orange-400/30';
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
          <LoadingLogo message="Loading dashboard..." />
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
      <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Static Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 bg-blue-500/5 rounded-full blur-3xl top-20 left-10"></div>
          <div className="absolute w-96 h-96 bg-blue-500/5 rounded-full blur-3xl bottom-20 right-10"></div>
        </div>

        <div className="relative z-10">
          <Head>
            <title>Admin Dashboard - EaglEye IntelDesk</title>
            <meta name="description" content="IntelDesk Admin Dashboard - Manage Users and System" />
          </Head>

          {/* Modern Header with Glassmorphism */}
          <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50 shadow-2xl">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                {/* Left: Branding & Welcome */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/20 border border-red-400/30">
                    <Shield className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-red-400">
                      Admin Control Center
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">
                      Welcome, <span className="text-blue-400 font-semibold">{user?.username}</span>
                      {isSuperAdmin && (
                        <span className="ml-2 px-2 py-0.5 bg-red-500/20 border border-red-400/30 rounded text-red-400 text-xs font-semibold">
                          SUPER ADMIN
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Right: Actions & Time */}
                <div className="flex items-center space-x-3">
                  {/* Live Clock */}
                  <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Local Time</div>
                      <div className="text-sm font-mono text-blue-400 font-semibold">
                        {currentTime.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <Link href="/admin/eagle-nest">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/40 rounded-lg text-green-400 hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-200 shadow-lg hover:shadow-green-500/20">
                      <Eye className="h-4 w-4" />
                      <span className="font-medium">Eagle Nest</span>
                    </button>
                  </Link>
                  
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-400/40 rounded-lg text-red-400 hover:from-red-500/30 hover:to-pink-500/30 transition-all duration-200 shadow-lg hover:shadow-red-500/20"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
          
            {/* Enhanced System Status Bar */}
            <div className="mb-8 p-4 bg-gradient-to-r from-slate-800/60 via-slate-900/60 to-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-6">
                  {/* System Health */}
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full ${
                        stats.systemHealth === 'good' ? 'bg-green-400' : 
                        stats.systemHealth === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                      } animate-pulse`}></div>
                      <div className={`absolute inset-0 w-3 h-3 rounded-full ${
                        stats.systemHealth === 'good' ? 'bg-green-400' : 
                        stats.systemHealth === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                      } animate-ping opacity-75`}></div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">System Status</div>
                      <div className={`text-sm font-bold ${getSystemHealthColor()}`}>
                        {stats.systemHealth === 'good' ? '● OPERATIONAL' : 
                         stats.systemHealth === 'warning' ? '● WARNING' : '● CRITICAL'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-px h-10 bg-slate-600"></div>
                  
                  {/* Activity Indicator */}
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                      <Activity className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Recent Activity</div>
                      <div className="text-sm font-bold text-blue-400">{stats.recentActivity} events</div>
                    </div>
                  </div>
                  
                  <div className="w-px h-10 bg-slate-600"></div>
                  
                  {/* Active Users */}
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500/10 border border-green-400/30 rounded-lg">
                      <Users className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Active Now</div>
                      <div className="text-sm font-bold text-green-400">{stats.activeUsers} users</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-slate-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            {/* Enhanced Stats Cards with Gradients */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {loading ? (
                <>
                  <SkeletonStatsCard />
                  <SkeletonStatsCard />
                  <SkeletonStatsCard />
                  <SkeletonStatsCard />
                </>
              ) : (
                <>
              {/* Total Users Card */}
              <div className="stagger-item card-animated backdrop-blur-md bg-gradient-to-br from-slate-800/50 to-red-900/20 border-2 border-red-500/30 rounded-lg p-6 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-red-500/30 to-red-500/10 border border-red-400/20 rounded-lg">
                    <Users className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="px-2 py-1 bg-red-500/20 border border-red-400/30 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-red-400" />
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-2">Total Users</p>
                  <p className="text-4xl font-bold text-white mb-1">
                    {stats.totalUsers}
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                    <p className="text-red-400 text-sm font-medium">
                      {stats.activeUsers} active
                    </p>
                  </div>
                </div>
              </div>

              {/* Advisories Card */}
              <div className="stagger-item card-animated backdrop-blur-md bg-gradient-to-br from-slate-800/50 to-orange-900/20 border-2 border-orange-500/30 rounded-lg p-6 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-orange-500/30 to-orange-500/10 border border-orange-400/20 rounded-lg">
                    <FileText className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="px-2 py-1 bg-orange-500/20 border border-orange-400/30 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-orange-400" />
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-2">Total Advisories</p>
                  <p className="text-4xl font-bold text-white mb-1">
                    {stats.totalAdvisories}
                  </p>
                  <p className="text-orange-400 text-sm font-medium">
                    published reports
                  </p>
                </div>
              </div>

              {/* Active Sessions Card */}
              <div className="stagger-item card-animated backdrop-blur-md bg-gradient-to-br from-slate-800/50 to-green-900/20 border-2 border-green-500/30 rounded-lg p-6 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500/30 to-green-500/10 border border-green-400/20 rounded-lg">
                    <Activity className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="px-2 py-1 bg-green-500/20 border border-green-400/30 rounded-lg">
                    <Clock className="h-4 w-4 text-green-400" />
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-2">Active Sessions</p>
                  <p className="text-4xl font-bold text-white mb-1">
                    {stats.activeUsers}
                  </p>
                  <p className="text-green-400 text-sm font-medium">
                    online now
                  </p>
                </div>
              </div>

              {/* System Load Card */}
              <div className="stagger-item card-animated backdrop-blur-md bg-gradient-to-br from-slate-800/50 to-yellow-900/20 border-2 border-yellow-500/30 rounded-lg p-6 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-yellow-500/30 to-yellow-500/10 border border-yellow-400/20 rounded-lg">
                    <Globe className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="px-2 py-1 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-2">System Load</p>
                  <p className="text-4xl font-bold text-white mb-1">
                    {Math.floor(Math.random() * 30 + 40)}%
                  </p>
                  <p className="text-yellow-400 text-sm font-medium">
                    optimal performance
                  </p>
                </div>
              </div>
                </>
              )}
            </div>

            {/* Modern Quick Actions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              {/* Advisory Management */}
              <div className="group relative overflow-hidden backdrop-blur-sm bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:shadow-2xl hover:border-blue-400/50 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-500/20 border border-red-400/30 rounded-lg">
                        <FileText className="h-5 w-5 text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">Advisories</h3>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">Manage threat intelligence reports and advisories</p>
                  <div className="space-y-2">
                    <Link href="/admin/advisory-editor">
                      <button className="w-full flex items-center justify-between p-3 bg-red-500/10 border border-red-400/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-all duration-200 group">
                        <div className="flex items-center space-x-2">
                          <Plus className="h-4 w-4" />
                          <span className="font-medium text-sm">Create Advisory</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</div>
                      </button>
                    </Link>
                    <Link href="/admin/eagle-nest">
                      <button className="w-full flex items-center justify-between p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200 group">
                        <div className="flex items-center space-x-2">
                          <Eye className="h-4 w-4" />
                          <span className="font-medium text-sm">View All</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</div>
                      </button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Threat Intelligence */}
              <div className="group relative overflow-hidden backdrop-blur-sm bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:shadow-2xl hover:border-blue-400/50 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-500/20 border border-orange-400/30 rounded-lg">
                        <Database className="h-5 w-5 text-cyan-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">Intelligence</h3>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">Access raw threat data and RSS feeds</p>
                  <div className="space-y-2">
                    <Link href="/admin/raw-articles">
                      <button className="w-full flex items-center justify-between p-3 bg-orange-500/10 border border-orange-400/30 rounded-lg text-orange-400 hover:bg-orange-500/20 transition-all duration-200 group">
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4" />
                          <span className="font-medium text-sm">Raw Articles</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</div>
                      </button>
                    </Link>
                    <Link href="/admin/feeds">
                      <button className="w-full flex items-center justify-between p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200 group">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium text-sm">Feeds</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</div>
                      </button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Client Management */}
              <div className="group relative overflow-hidden backdrop-blur-sm bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:shadow-2xl hover:border-green-400/50 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-500/20 border border-green-400/30 rounded-lg">
                        <Mail className="h-5 w-5 text-green-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">Clients</h3>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">Manage client organizations and emails</p>
                  <div className="space-y-2">
                    <Link href="/admin/clients">
                      <button className="w-full flex items-center justify-between p-3 bg-green-500/10 border border-green-400/30 rounded-lg text-green-400 hover:bg-green-500/20 transition-all duration-200 group">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <span className="font-medium text-sm">Manage Clients</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</div>
                      </button>
                    </Link>
                    <Link href="/scheduled-emails">
                      <button className="w-full flex items-center justify-between p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200 group">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <span className="font-medium text-sm">Email Schedule</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</div>
                      </button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* User Management */}
              <div className="group relative overflow-hidden backdrop-blur-sm bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:shadow-2xl hover:border-amber-400/50 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-lg">
                        <Users className="h-5 w-5 text-amber-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">Users</h3>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">Manage platform users and permissions</p>
                  <div className="space-y-2">
                    <Link href="/admin/users">
                      <button className="w-full flex items-center justify-between p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-all duration-200 group">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span className="font-medium text-sm">Manage Users</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</div>
                      </button>
                    </Link>
                {isSuperAdmin && (
                  <button className="w-full flex items-center justify-between p-4 bg-red-500/10 border border-red-400/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-all duration-200 group">
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
            </div>

            {/* Enhanced Recent Users Table */}
            <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/60 to-slate-900/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Recent Users</h3>
                      <p className="text-slate-400 text-sm">Latest registered accounts</p>
                    </div>
                  </div>
                  <Link href="/admin/users">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500/10 border border-blue-400/30 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-all duration-200 group">
                      <span className="font-medium text-sm">View All</span>
                      <div className="group-hover:translate-x-1 transition-transform">→</div>
                    </button>
                  </Link>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50 border-b border-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User Details</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {users.slice(0, 5).map((userData, index) => (
                      <tr key={userData._id} className="hover:bg-slate-700/20 transition-all duration-200 group">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-400/30">
                              <span className="text-blue-400 font-bold text-sm">
                                {userData.username.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold text-white text-sm">{userData.username}</div>
                              <div className="text-slate-400 text-sm">{userData.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${getRoleColor(userData.role)}`}>
                            {getRoleIcon(userData.role)}
                            <span>{userData.role.replace('_', ' ').toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              userData.isActive ? 'bg-green-400' : 'bg-red-400'
                            } animate-pulse`}></div>
                            <span className={`text-sm font-medium ${
                              userData.isActive ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {userData.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-300 text-sm font-medium">
                            {new Date(userData.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {new Date(userData.createdAt).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {users.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm">No users found</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </HydrationSafe>
  );
}
