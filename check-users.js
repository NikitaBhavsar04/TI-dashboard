// Quick script to check existing users
const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users = await User.find({}, 'username email role isActive').lean();
    
    console.log('📋 Current Users:');
    users.forEach(user => {
      console.log(`   ${user.email} (${user.username}) - Role: ${user.role} - Active: ${user.isActive}`);
    });
    
    if (users.length === 0) {
      console.log('   No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();
