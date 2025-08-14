import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requireAdmin, requireAuth, requireSuperAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/auditLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        // Require authentication to view users
        const currentUser = requireAuth(req);
        
        // Regular users can only see their own profile
        if (currentUser.role === 'user') {
          const user = await User.findById(currentUser.userId);
          return res.status(200).json({ users: [user] });
        }

        // Admin and super_admin can see all users
        const users = await User.find({}).sort({ createdAt: -1 });
        
        // Log the access
        await logActivity(currentUser, {
          action: 'system_accessed',
          resource: 'user_list'
        }, req);
        
        res.status(200).json({ users });
      } catch (error: any) {
        if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
          return res.status(401).json({ error: error.message });
        }
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
      }
      break;

    case 'POST':
      try {
        // Only super_admin and admin can create new users
        const currentUser = requireAdmin(req);
        
        const { username, email, password, role = 'user' } = req.body;

        if (!username || !email || !password) {
          return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Role permission checks
        if (role === 'super_admin' && currentUser.role !== 'super_admin') {
          return res.status(403).json({ error: 'Only super administrators can create super admin accounts' });
        }
        
        if (role === 'admin' && currentUser.role !== 'super_admin') {
          return res.status(403).json({ error: 'Only super administrators can create admin accounts' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [{ email: email.toLowerCase() }, { username }]
        });

        if (existingUser) {
          return res.status(400).json({ error: 'User with this email or username already exists' });
        }

        // Create new user
        const newUser = new User({
          username,
          email: email.toLowerCase(),
          password,
          role,
          createdBy: currentUser.username
        });

        await newUser.save();

        // Log the activity
        await logActivity(currentUser, {
          action: 'user_created',
          resource: 'user',
          resourceId: newUser._id.toString(),
          details: `Created ${role} user: ${username} (${email})`
        }, req);

        res.status(201).json({
          message: 'User created successfully',
          user: newUser
        });
      } catch (error: any) {
        if (error.message === 'Authentication required' || error.message === 'Admin access required') {
          return res.status(401).json({ error: error.message });
        }
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
      }
      break;

    case 'PUT':
      try {
        const currentUser = requireAuth(req);
        const { userId, username, email, role, isActive } = req.body;

        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        // Users can only update their own profile (except role and isActive)
        // Admins can update any user (except role changes)
        // Super admins can update anything
        if (currentUser.role === 'user' && currentUser.userId !== userId) {
          return res.status(403).json({ error: 'Can only update your own profile' });
        }

        const updateData: any = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email.toLowerCase();

        // Role and status changes
        if (currentUser.role === 'super_admin') {
          // Super admin can change anything
          if (role !== undefined) updateData.role = role;
          if (isActive !== undefined) updateData.isActive = isActive;
        } else if (currentUser.role === 'admin') {
          // Admin cannot change roles or deactivate other admins/super_admins
          const targetUser = await User.findById(userId);
          if (targetUser && (targetUser.role === 'admin' || targetUser.role === 'super_admin') && currentUser.userId !== userId) {
            if (role !== undefined || isActive !== undefined) {
              return res.status(403).json({ error: 'Cannot modify admin or super admin accounts' });
            }
          }
          // Admin can only change isActive for regular users
          if (isActive !== undefined && targetUser && targetUser.role === 'user') {
            updateData.isActive = isActive;
          }
        }

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Log the activity
        await logActivity(currentUser, {
          action: 'user_updated',
          resource: 'user',
          resourceId: userId,
          details: `Updated user: ${user.username}`
        }, req);

        res.status(200).json({
          message: 'User updated successfully',
          user
        });
      } catch (error: any) {
        if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
          return res.status(401).json({ error: error.message });
        }
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
      }
      break;

    case 'DELETE':
      try {
        // Only super_admin and admin can delete users
        const currentUser = requireAdmin(req);
        const { userId } = req.body;

        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        // Don't allow deletion of own account
        if (currentUser.userId === userId) {
          return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Role-based deletion restrictions
        if (currentUser.role === 'admin') {
          if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
            return res.status(403).json({ error: 'Cannot delete admin or super admin accounts' });
          }
        }

        await User.findByIdAndDelete(userId);

        // Log the activity
        await logActivity(currentUser, {
          action: 'user_deleted',
          resource: 'user',
          resourceId: userId,
          details: `Deleted user: ${targetUser.username}`
        }, req);

        res.status(200).json({ message: 'User deleted successfully' });
      } catch (error: any) {
        if (error.message === 'Authentication required' || error.message === 'Admin access required') {
          return res.status(401).json({ error: error.message });
        }
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
