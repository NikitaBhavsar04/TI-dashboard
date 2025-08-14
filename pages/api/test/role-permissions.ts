// Test API to verify role creation permissions
import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Test the exact same logic as AuthContext
    const canCreateRole = (userRole: string, targetRole: string): boolean => {
      if (userRole === 'super_admin') {
        return ['user', 'admin', 'super_admin'].includes(targetRole);
      }
      
      if (userRole === 'admin') {
        return targetRole === 'user';
      }
      
      return false;
    };

    const roleOptions = [];
    
    if (canCreateRole(decoded.role, 'user')) {
      roleOptions.push({ value: 'user', label: 'User' });
    }
    
    if (canCreateRole(decoded.role, 'admin')) {
      roleOptions.push({ value: 'admin', label: 'Admin' });
    }
    
    if (canCreateRole(decoded.role, 'super_admin')) {
      roleOptions.push({ value: 'super_admin', label: 'Super Admin' });
    }

    return res.status(200).json({
      success: true,
      currentUser: {
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role
      },
      permissions: {
        canCreateUser: canCreateRole(decoded.role, 'user'),
        canCreateAdmin: canCreateRole(decoded.role, 'admin'),
        canCreateSuperAdmin: canCreateRole(decoded.role, 'super_admin'),
        isSuperAdmin: decoded.role === 'super_admin'
      },
      availableRoleOptions: roleOptions,
      expectedBehavior: {
        forSuperAdmin: 'Should see User, Admin, and Super Admin options',
        forAdmin: 'Should see only User option',
        forUser: 'Should see no options (no create access)'
      }
    });

  } catch (error) {
    console.error('Role test error:', error);
    return res.status(500).json({ 
      error: 'Test failed', 
      details: error.message 
    });
  }
}
