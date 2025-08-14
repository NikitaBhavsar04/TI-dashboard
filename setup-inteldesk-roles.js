// Script to convert admin to super_admin and create new admin
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

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

    console.log('🔍 Checking current users...');
    const allUsers = await User.find({}, 'username email role').lean();
    
    console.log('📋 Current Users:');
    allUsers.forEach(user => {
      console.log(`   ${user.email} (${user.username}) - Role: ${user.role}`);
    });

    // Step 1: Convert existing admin to super_admin
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('\\n🔄 Converting existing admin to super_admin...');
      await User.updateOne(
        { _id: existingAdmin._id },
        { 
          $set: { 
            role: 'super_admin',
            updatedAt: new Date()
          }
        }
      );
      console.log('✅ Converted to super_admin:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log('   🔑 Use existing password to login as super_admin');
    } else {
      console.log('\\n⚠️  No existing admin found. Creating super_admin first...');
      
      const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12);
      
      const superAdmin = new User({
        username: 'superadmin',
        email: 'superadmin@inteldesk.com',
        password: hashedPassword,
        role: 'super_admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      });

      await superAdmin.save();
      console.log('✅ Created super_admin:');
      console.log('   Email: superadmin@inteldesk.com');
      console.log('   Password: SuperAdmin123!');
    }

    // Step 2: Create new admin user
    console.log('\\n👤 Creating new admin user...');
    
    const existingNewAdmin = await User.findOne({ email: 'admin@inteldesk.com' });
    
    if (existingNewAdmin) {
      console.log('ℹ️  Admin user already exists: admin@inteldesk.com');
    } else {
      const hashedAdminPassword = await bcrypt.hash('Admin123!', 12);
      
      const newAdmin = new User({
        username: 'admin',
        email: 'admin@inteldesk.com',
        password: hashedAdminPassword,
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      });

      await newAdmin.save();
      console.log('✅ Created new admin user:');
      console.log('   Email: admin@inteldesk.com');
      console.log('   Password: Admin123!');
    }

    // Display final summary
    console.log('\\n🎉 Role setup completed!');
    console.log('\\n📋 Final User Summary:');
    
    const finalUsers = await User.find({}, 'username email role isActive').lean();
    finalUsers.forEach(user => {
      const roleIcon = user.role === 'super_admin' ? '👑' : user.role === 'admin' ? '🛡️' : '👤';
      console.log(`   ${roleIcon} ${user.email} (${user.username}) - ${user.role.toUpperCase()}`);
    });

    console.log('\\n🔐 Login Credentials:');
    console.log('\\n   SUPER ADMIN (Full Access):');
    
    if (existingAdmin) {
      console.log(`   Email: ${existingAdmin.email}`);
      console.log('   Password: [Use existing admin password]');
    } else {
      console.log('   Email: superadmin@inteldesk.com');
      console.log('   Password: SuperAdmin123!');
    }
    
    console.log('\\n   ADMIN (Limited Access):');
    console.log('   Email: admin@inteldesk.com');
    console.log('   Password: Admin123!');

    console.log('\\n📊 Permission Summary:');
    console.log('   👑 SUPER_ADMIN:');
    console.log('      ✅ Can create any user role');
    console.log('      ✅ Can see client email addresses');
    console.log('      ✅ Can delete users and clients');
    console.log('      ✅ Full system access');
    console.log('\\n   🛡️  ADMIN:');
    console.log('      ✅ Can create user accounts only');
    console.log('      ❌ Cannot create admin/super_admin accounts');
    console.log('      ❌ Cannot see client email addresses');
    console.log('      ❌ Cannot delete clients');
    console.log('      ✅ Can view audit logs');

    console.log('\\n⚠️  IMPORTANT: Change default passwords after first login!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\\n🔌 Database connection closed');
  }
}

console.log('🚀 Starting IntelDesk RBAC Setup...');
console.log('=====================================\\n');

setupRoles();
