import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Search, 
  Filter, 
  Calendar,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  Shield,
  ShieldCheck,
  Crown
} from 'lucide-react';

interface AuditLogEntry {
  _id: string;
  userId: {
    _id: string;
    username: string;
    email: string;
    role: string;
  };
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const AuditLogViewer: React.FC = () => {
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    userId: ''
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.action && { action: filters.action }),
        ...(filters.resource && { resourceType: filters.resource }),
        ...(filters.userId && { userId: filters.userId })
      });

      const response = await fetch(`/api/audit?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch audit logs');
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRole('admin')) {
      fetchLogs();
    }
  }, [filters]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
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

  const getActionColor = (action: string) => {
    if (action.includes('created') || action.includes('login')) {
      return 'bg-green-500/20 text-green-300';
    }
    if (action.includes('updated') || action.includes('modified')) {
      return 'bg-yellow-500/20 text-yellow-300';
    }
    if (action.includes('deleted') || action.includes('failed')) {
      return 'bg-red-500/20 text-red-300';
    }
    return 'bg-blue-500/20 text-blue-300';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  const toggleExpandRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  if (!hasRole('admin')) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-orbitron text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">Admin privileges required to view audit logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-orbitron font-bold text-white mb-2">Audit Logs</h1>
          <p className="text-slate-400 font-rajdhani">
            Track all system activities and user actions
          </p>
        </div>

        {/* Filters */}
        <div className="glass-panel-hover p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-slate-400 font-rajdhani text-sm mb-2">Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani focus:outline-none focus:border-neon-blue/50"
              >
                <option value="">All Actions</option>
                <option value="user_login">Login</option>
                <option value="user_logout">Logout</option>
                <option value="user_created">User Created</option>
                <option value="user_updated">User Updated</option>
                <option value="user_deleted">User Deleted</option>
                <option value="client_created">Client Created</option>
                <option value="client_updated">Client Updated</option>
                <option value="client_deleted">Client Deleted</option>
                <option value="clients_accessed">Clients Accessed</option>
                <option value="client_viewed">Client Viewed</option>
                <option value="system_accessed">System Accessed</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-rajdhani text-sm mb-2">Resource</label>
              <select
                value={filters.resource}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani focus:outline-none focus:border-neon-blue/50"
              >
                <option value="">All Resources</option>
                <option value="user">Users</option>
                <option value="user_list">User List</option>
                <option value="client">Clients</option>
                <option value="client_list">Client List</option>
                <option value="advisory">Advisories</option>
                <option value="email">Emails</option>
                <option value="system">System</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-rajdhani text-sm mb-2">User ID</label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="Enter user ID"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({ action: '', resource: '', userId: '' })}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-400 hover:bg-slate-600/50 transition-all duration-200 font-rajdhani"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="glass-panel-hover overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading audit logs...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-600/50">
                    <tr className="text-left">
                      <th className="px-6 py-4 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-4 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">Action</th>
                      <th className="px-6 py-4 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">Resource</th>
                      <th className="px-6 py-4 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <React.Fragment key={log._id}>
                        <tr 
                          className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-all duration-200 cursor-pointer"
                          onClick={() => toggleExpandRow(log._id)}
                        >
                          <td className="px-6 py-4">
                            <div className="text-white font-rajdhani">
                              {formatTimestamp(log.timestamp).date}
                            </div>
                            <div className="text-slate-400 font-rajdhani text-sm">
                              {formatTimestamp(log.timestamp).time}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div>
                                <div className="font-orbitron font-medium text-white">{log.userId.username}</div>
                                <div className="text-slate-400 font-rajdhani text-sm">{log.userId.email}</div>
                                <span className={`inline-flex items-center space-x-1 px-2 py-1 mt-1 rounded-full text-xs border ${getRoleColor(log.userId.role)}`}>
                                  {getRoleIcon(log.userId.role)}
                                  <span>{log.userId.role.replace('_', ' ').toUpperCase()}</span>
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg text-sm ${getActionColor(log.action)}`}>
                              {log.action.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-white font-rajdhani">{log.resource}</div>
                            {log.resourceId && (
                              <div className="text-slate-400 font-mono text-xs">{log.resourceId}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              {log.details ? (
                                <span className="text-slate-300 font-rajdhani text-sm">
                                  {log.details.length > 50 ? `${log.details.substring(0, 50)}...` : log.details}
                                </span>
                              ) : (
                                <span className="text-slate-500 font-rajdhani text-sm">No details</span>
                              )}
                              <Eye className="h-4 w-4 text-slate-400" />
                            </div>
                          </td>
                        </tr>
                        {expandedRow === log._id && (
                          <tr className="bg-slate-800/50">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="space-y-3">
                                {log.details && (
                                  <div>
                                    <h4 className="text-slate-400 font-rajdhani text-sm font-medium mb-1">Full Details:</h4>
                                    <p className="text-slate-300 font-rajdhani">{log.details}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  {log.ipAddress && (
                                    <div>
                                      <span className="text-slate-400 font-rajdhani">IP Address:</span>
                                      <span className="text-slate-300 font-mono ml-2">{log.ipAddress}</span>
                                    </div>
                                  )}
                                  {log.userAgent && (
                                    <div>
                                      <span className="text-slate-400 font-rajdhani">User Agent:</span>
                                      <span className="text-slate-300 font-mono ml-2 text-xs">{log.userAgent}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-slate-400 font-rajdhani">Full Timestamp:</span>
                                    <span className="text-slate-300 font-mono ml-2">{new Date(log.timestamp).toISOString()}</span>
                                  </div>
                                  {log.resourceId && (
                                    <div>
                                      <span className="text-slate-400 font-rajdhani">Resource ID:</span>
                                      <span className="text-slate-300 font-mono ml-2">{log.resourceId}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center p-6 border-t border-slate-600/50">
                <div className="text-sm text-slate-400 font-rajdhani">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchLogs(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="flex items-center space-x-1 px-3 py-2 border border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:bg-slate-700/50 transition-all duration-200 font-rajdhani"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>
                  <span className="px-3 py-2 text-slate-400 font-rajdhani">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => fetchLogs(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="flex items-center space-x-1 px-3 py-2 border border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:bg-slate-700/50 transition-all duration-200 font-rajdhani"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewer;
