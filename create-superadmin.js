// Simple script to create super admin user
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection string - update if needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://threatadvisory:7U%402dRJagX5kFXE@threatadvisory.atzvfoo.mongodb.net/threat-advisory?retryWrites=true&w=majority';

async function createSuperAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define User schema
    const UserSchema = new mongoose.Schema({
      username: String,
      email: String,
      password: String,
      role: String,
      isActive: Boolean,
      createdAt: Date,
      updatedAt: Date,
      createdBy: String
    });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      console.log('Super admin already exists:');
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Username: ${existingSuperAdmin.username}`);
      return;
    }

    // Check if any admin exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('🔄 Converting existing admin to super_admin...');
      await User.updateOne(
        { _id: existingAdmin._id },
        { 
          $set: { 
            role: 'super_admin',
            updatedAt: new Date()
          }
        }
      );
      console.log('Converted admin to super_admin:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log('   Use the existing admin password to login');
      return;
    }

    // Create new super admin
    console.log('🆕 Creating new super admin user...');
    
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12);
    
    const superAdmin = new User({
      username: 'superadmin',
      email: 'superadmin@threatadvisory.com',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    });

    await superAdmin.save();
    
    console.log('Super admin created successfully!');
    console.log('');
    console.log('🔐 Super Admin Login Credentials:');
    console.log('   Email: superadmin@threatadvisory.com');
    console.log('   Password: SuperAdmin123!');
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password after first login!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

createSuperAdmin();
