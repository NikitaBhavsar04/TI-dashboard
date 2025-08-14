// API endpoint to get actual login credentials
import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // Reset super_admin password to a known password
    const superAdmin = await User.findOne({ role: 'super_admin' });
    
    if (superAdmin) {
      // Set a known password for super_admin
      const newPassword = 'SuperAdmin123!';
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      await User.updateOne(
        { _id: superAdmin._id },
        { 
          $set: { 
            password: hashedPassword,
            updatedAt: new Date()
          }
        }
      );

      // Also reset admin password
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        const adminPassword = 'Admin123!';
        const adminSalt = await bcrypt.genSalt(12);
        const adminHashedPassword = await bcrypt.hash(adminPassword, adminSalt);
        
        await User.updateOne(
          { _id: admin._id },
          { 
            $set: { 
              password: adminHashedPassword,
              updatedAt: new Date()
            }
          }
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Passwords reset successfully',
        credentials: {
          superAdmin: {
            email: superAdmin.email,
            username: superAdmin.username,
            password: newPassword,
            role: 'super_admin'
          },
          admin: admin ? {
            email: admin.email,
            username: admin.username, 
            password: 'Admin123!',
            role: 'admin'
          } : null
        },
        loginInstructions: {
          step1: 'Go to your login page',
          step2: `Use email: ${superAdmin.email}`,
          step3: `Use password: ${newPassword}`,
          step4: 'You will have full super admin access'
        }
      });

    } else {
      // Create super admin if none exists
      const newPassword = 'SuperAdmin123!';
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      const newSuperAdmin = new User({
        username: 'superadmin',
        email: 'superadmin@inteldesk.com',
        password: hashedPassword,
        role: 'super_admin',
        isActive: true,
        createdBy: 'system'
      });

      await newSuperAdmin.save();

      return res.status(200).json({
        success: true,
        message: 'Super admin created successfully',
        credentials: {
          superAdmin: {
            email: 'superadmin@inteldesk.com',
            username: 'superadmin',
            password: newPassword,
            role: 'super_admin'
          }
        }
      });
    }

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ 
      error: 'Password reset failed', 
      details: error.message 
    });
  }
}
