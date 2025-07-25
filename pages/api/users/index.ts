import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requireAdmin, requireAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        // Require authentication to view users
        const currentUser = requireAuth(req);
        
        // Regular users can only see their own profile
        if (currentUser.role !== 'admin') {
          const user = await User.findById(currentUser.userId);
          return res.status(200).json({ users: [user] });
        }

        // Admin can see all users
        const users = await User.find({}).sort({ createdAt: -1 });
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
        // Only admin can create new users
        const currentUser = requireAdmin(req);
        
        const { username, email, password, role = 'user' } = req.body;

        if (!username || !email || !password) {
          return res.status(400).json({ error: 'Username, email, and password are required' });
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

        res.status(201).json({
          message: 'User created successfully',
          user: newUser
        });
      } catch (error: any) {
        if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
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
        // Admins can update any user
        if (currentUser.role !== 'admin' && currentUser.userId !== userId) {
          return res.status(403).json({ error: 'Can only update your own profile' });
        }

        const updateData: any = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email.toLowerCase();

        // Only admin can change role and isActive status
        if (currentUser.role === 'admin') {
          if (role !== undefined) updateData.role = role;
          if (isActive !== undefined) updateData.isActive = isActive;
        }

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

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
        const currentUser = requireAdmin(req);
        const { userId } = req.body;

        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        // Don't allow admin to delete themselves
        if (currentUser.userId === userId) {
          return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const user = await User.findByIdAndDelete(userId);
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
      } catch (error: any) {
        if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
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
