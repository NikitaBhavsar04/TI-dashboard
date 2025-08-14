// Test component to debug role permissions
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const RoleDebugger: React.FC = () => {
  const { user, canCreateRole, isSuperAdmin } = useAuth();

  React.useEffect(() => {
    console.log('🔍 Role Debugger:', {
      user,
      userRole: user?.role,
      isSuperAdmin,
      canCreateUser: canCreateRole('user'),
      canCreateAdmin: canCreateRole('admin'), 
      canCreateSuperAdmin: canCreateRole('super_admin')
    });
  }, [user, canCreateRole, isSuperAdmin]);

  if (!user) return <div>Not logged in</div>;

  return (
    <div className="p-4 bg-gray-800 text-white rounded">
      <h3 className="text-lg font-bold mb-4">Role Debug Information</h3>
      <div className="space-y-2">
        <div><strong>Username:</strong> {user.username}</div>
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Role:</strong> {user.role}</div>
        <div><strong>Is Super Admin:</strong> {isSuperAdmin ? 'Yes' : 'No'}</div>
        <div><strong>Can Create User:</strong> {canCreateRole('user') ? 'Yes' : 'No'}</div>
        <div><strong>Can Create Admin:</strong> {canCreateRole('admin') ? 'Yes' : 'No'}</div>
        <div><strong>Can Create Super Admin:</strong> {canCreateRole('super_admin') ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
};

export default RoleDebugger;
