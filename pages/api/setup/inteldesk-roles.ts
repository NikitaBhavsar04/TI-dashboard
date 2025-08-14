// API endpoint to setup IntelDesk roles
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
    
    const results = {
      converted: null,
      newAdmin: null,
      summary: []
    };

    // Check current users
    const allUsers = await User.find({}, 'username email role').lean();
    console.log('Current users:', allUsers);

    // Step 1: Convert existing admin to super_admin
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      await User.updateOne(
        { _id: existingAdmin._id },
        { 
          $set: { 
            role: 'super_admin',
            updatedAt: new Date()
          }
        }
      );
      
      results.converted = {
        email: existingAdmin.email,
        username: existingAdmin.username,
        message: 'Converted to super_admin - use existing password'
      };
    } else {
      // Create super_admin if no admin exists
      const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12);
      
      const superAdmin = new User({
        username: 'superadmin',
        email: 'superadmin@inteldesk.com',
        password: hashedPassword,
        role: 'super_admin',
        isActive: true,
        createdBy: 'system'
      });

      await superAdmin.save();
      
      results.converted = {
        email: 'superadmin@inteldesk.com',
        username: 'superadmin',
        password: 'SuperAdmin123!',
        message: 'Created new super_admin'
      };
    }

    // Step 2: Create new admin user
    const existingNewAdmin = await User.findOne({ email: 'admin@inteldesk.com' });
    
    if (!existingNewAdmin) {
      const hashedAdminPassword = await bcrypt.hash('Admin123!', 12);
      
      const newAdmin = new User({
        username: 'admin',
        email: 'admin@inteldesk.com',
        password: hashedAdminPassword,
        role: 'admin',
        isActive: true,
        createdBy: 'system'
      });

      await newAdmin.save();
      
      results.newAdmin = {
        email: 'admin@inteldesk.com',
        username: 'admin',
        password: 'Admin123!',
        message: 'Created new admin user'
      };
    } else {
      results.newAdmin = {
        email: 'admin@inteldesk.com',
        message: 'Admin user already exists'
      };
    }

    // Get final summary
    const finalUsers = await User.find({}, 'username email role isActive').lean();
    results.summary = finalUsers.map(user => ({
      email: user.email,
      username: user.username,
      role: user.role,
      active: user.isActive
    }));

    return res.status(200).json({
      success: true,
      message: 'IntelDesk RBAC setup completed successfully',
      data: results,
      credentials: {
        superAdmin: results.converted,
        admin: results.newAdmin
      }
    });

  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ 
      error: 'Setup failed', 
      details: error.message 
    });
  }
}
