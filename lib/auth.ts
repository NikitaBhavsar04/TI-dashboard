import jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';
import { IUser } from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
}

export const generateToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const extractTokenFromRequest = (req: NextApiRequest): string | null => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check cookies for web requests
  console.log('Auth - Checking cookies:', req.cookies);
  if (req.cookies.token) {
    console.log('Auth - Found token in cookies');
    return req.cookies.token;
  }
  
  console.log('Auth - No token found in headers or cookies');
  return null;
};

export const getUserFromRequest = (req: NextApiRequest): TokenPayload | null => {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  
  return verifyToken(token);
};

export const requireAuth = (req: NextApiRequest, requiredRole?: 'super_admin' | 'admin' | 'user'): TokenPayload => {
  const user = getUserFromRequest(req);
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  // Role hierarchy: super_admin (3) > admin (2) > user (1)
  const getRoleLevel = (role: string) => {
    switch (role) {
      case 'super_admin': return 3;
      case 'admin': return 2;  
      case 'user': return 1;
      default: return 0;
    }
  };
  
  if (requiredRole) {
    const userLevel = getRoleLevel(user.role);
    const requiredLevel = getRoleLevel(requiredRole);
    
    if (userLevel < requiredLevel) {
      throw new Error('Insufficient permissions');
    }
  }
  
  return user;
};

export const requireAdmin = (req: NextApiRequest): TokenPayload => {
  const user = getUserFromRequest(req);
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  
  return user;
};

export const requireSuperAdmin = (req: NextApiRequest): TokenPayload => {
  return requireAuth(req, 'super_admin');
};
