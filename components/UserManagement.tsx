import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Search, 
  Check, 
  X,
  UserPlus,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Crown
} from 'lucide-react';

interface User {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  createdBy?: string;
}

interface UserFormData {
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin' | 'super_admin';
  isActive: boolean;
}

const UserManagement: React.FC = () => {
  const { user, hasRole, canCreateRole, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    password: '',
    role: 'user',
    isActive: true
  });

  useEffect(() => {
    if (hasRole('admin')) {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (u?: User) => {
    if (u) {
      setEditingUser(u);
      setFormData({
        username: u.username,
        email: u.email,
        password: '',
        role: u.role,
        isActive: u.isActive
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'user',
        isActive: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'user',
      isActive: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.email.trim()) {
      alert('Username and email are required');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      alert('Password is required for new users');
      return;
    }

    if (!canCreateRole(formData.role)) {
      alert('You do not have permission to create users with this role');
      return;
    }

    try {
      const payload: any = { ...formData };
      if (editingUser && !payload.password) {
        delete payload.password; // Don't update password if not provided
      }

      const url = editingUser ? `/api/users` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      if (editingUser) {
        payload.userId = editingUser._id;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message);
        handleCloseModal();
        fetchUsers();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: string, userToDelete: User) => {
    if (!isSuperAdmin) {
      alert('Only super administrators can delete users');
      return;
    }

    if (user?.id === userId) {
      alert('You cannot delete your own account');
      return;
    }

    if (confirm(`Are you sure you want to delete user "${userToDelete.username}"? This action cannot be undone.`)) {
      try {
        const response = await fetch('/api/users', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
          credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
          alert(result.message);
          fetchUsers();
        } else {
          alert(`Error: ${result.error}`);
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user');
      }
    }
  };

  const getRoleOptions = () => {
    const options = [];
    
    if (canCreateRole('user')) {
      options.push({ value: 'user', label: 'User' });
    }
    
    if (canCreateRole('admin')) {
      options.push({ value: 'admin', label: 'Admin' });
    }
    
    if (canCreateRole('super_admin')) {
      options.push({ value: 'super_admin', label: 'Super Admin' });
    }
    
    return options;
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

  if (!hasRole('admin')) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-orbitron text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">Admin privileges required to access user management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-orbitron font-bold text-white mb-2">User Management</h1>
            <p className="text-slate-400 font-rajdhani">
              Manage system users and their access levels
            </p>
          </div>
        </div>

        {/* Search and Add User */}
        <div className="glass-panel-hover p-6 mb-6">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
              />
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center space-x-2 px-4 py-3 bg-neon-blue/20 border border-neon-blue/50 rounded-lg text-neon-blue hover:bg-neon-blue/30 transition-all duration-200 font-rajdhani whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              <span>Add User</span>
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="glass-panel-hover">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-600/50">
                  <tr className="text-left">
                    <th className="px-6 py-4 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-slate-400 font-rajdhani text-sm uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-all duration-200">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-orbitron font-medium text-white">{u.username}</div>
                          <div className="text-slate-400 font-rajdhani text-sm">{u.email}</div>
                          {u.createdBy && (
                            <div className="text-slate-500 font-rajdhani text-xs">Created by: {u.createdBy}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs border ${getRoleColor(u.role)}`}>
                          {getRoleIcon(u.role)}
                          <span>{u.role.replace('_', ' ').toUpperCase()}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs border ${
                          u.isActive 
                            ? 'bg-green-500/20 text-green-300 border-green-400/30' 
                            : 'bg-red-500/20 text-red-300 border-red-400/30'
                        }`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-rajdhani text-sm">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleOpenModal(u)}
                            className="p-2 bg-blue-500/20 border border-blue-400/50 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-all duration-200"
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {isSuperAdmin && u._id !== user?.id && (
                            <button
                              onClick={() => handleDeleteUser(u._id, u)}
                              className="p-2 bg-red-500/20 border border-red-400/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all duration-200"
                              title="Delete user (Super Admin only)"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel-hover max-w-md w-full">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-600/50">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neon-blue/20 border border-neon-blue/50">
                    <UserPlus className="h-5 w-5 text-neon-blue" />
                  </div>
                  <div>
                    <h2 className="font-orbitron font-bold text-xl text-white">
                      {editingUser ? 'Edit User' : 'Add New User'}
                    </h2>
                    <p className="text-slate-400 font-rajdhani text-sm">
                      {editingUser ? 'Update user information' : 'Create a new system user'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 transition-all duration-200"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="px-6 space-y-6">
                
                {/* Username */}
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 transition-all duration-200"
                    placeholder="Enter username"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 transition-all duration-200"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    Password {!editingUser ? '*' : '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 transition-all duration-200"
                    placeholder="Enter password"
                    required={!editingUser}
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani focus:outline-none focus:border-neon-blue/50 transition-all duration-200"
                    required
                  >
                    {getRoleOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-slate-500 font-rajdhani text-xs mt-1">
                    You can only create roles at or below your permission level
                  </p>
                </div>

                {/* Active Status */}
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-5 h-5 text-neon-blue bg-slate-800 border-slate-600 rounded focus:ring-neon-blue focus:ring-2"
                    />
                    <span className="text-slate-400 font-rajdhani">Active user account</span>
                  </label>
                </div>

              </div>

              <div className="flex justify-end space-x-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-slate-400 hover:bg-slate-700/50 transition-all duration-200 font-rajdhani"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neon-blue/20 border border-neon-blue/50 rounded-lg text-neon-blue hover:bg-neon-blue/30 transition-all duration-200 font-rajdhani"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
