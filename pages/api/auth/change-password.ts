// API endpoint for users to change their own password
import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/auth';
import { logActivity } from '../../../lib/auditLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Verify user is authenticated
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      await logActivity(
        decoded,
        {
          action: 'PASSWORD_CHANGE_FAILED',
          resource: 'user',
          resourceId: decoded.userId,
          details: 'Failed password change attempt - incorrect current password'
        },
        req
      );
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password (will be hashed by the pre-save middleware)
    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save();

    // Log successful password change
    await logActivity(
      decoded,
      {
        action: 'PASSWORD_CHANGED',
        resource: 'user',
        resourceId: decoded.userId,
        details: 'User successfully changed their password'
      },
      req
    );

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ 
      error: 'Password change failed', 
      details: error.message 
    });
  }
}
