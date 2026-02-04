// Script to check existing users in the database
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define User schema
    const UserSchema = new mongoose.Schema({
      username: String,
      email: String,
      password: String,
      role: String,
      isActive: Boolean,
      createdAt: Date,
      lastLogin: Date,
      createdBy: String
    });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Get all users
    const users = await User.find({}).select('username email role isActive createdAt lastLogin');
    
    console.log('\n📊 Users in database:');
    console.log('====================');
    
    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('\nTo create a super admin, run:');
      console.log('   node create-superadmin.js');
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. User:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   Last Login: ${user.lastLogin || 'Never'}`);
      });
    }

    // Test password comparison for a specific user
    const testEmail = 'admin@threatwatch.com';
    const testPassword = 'Admin@123';
    
    console.log('\n🔐 Testing login credentials:');
    console.log(`   Email: ${testEmail}`);
    
    const user = await User.findOne({ email: testEmail.toLowerCase() });
    
    if (!user) {
      console.log(`   ❌ User not found with email: ${testEmail}`);
    } else {
      console.log(`   ✅ User found`);
      console.log(`   Active: ${user.isActive}`);
      
      // Try to compare password
      try {
        const isMatch = await bcrypt.compare(testPassword, user.password);
        console.log(`   Password matches: ${isMatch ? '✅ YES' : '❌ NO'}`);
      } catch (error) {
        console.log(`   ❌ Error comparing password: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkUsers();
