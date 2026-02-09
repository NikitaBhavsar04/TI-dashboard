// Script to create test users for access control testing
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// MongoDB connection string from env
const MONGODB_URI = process.env.MONGODB_URI;

async function createTestUsers() {
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

    // Test users to create
    const testUsers = [
      {
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123',
        role: 'user'
      },
      {
        username: 'testadmin', 
        email: 'testadmin@example.com',
        password: 'password123',
        role: 'admin'
      },
      {
        username: 'testsuperadmin',
        email: 'testsuperadmin@example.com', 
        password: 'password123',
        role: 'super_admin'
      }
    ];

    console.log('🚀 Creating test users...\n');

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });

      if (existingUser) {
        console.log(`⚠️  User already exists: ${userData.username} (${userData.email})`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const newUser = new User({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-script'
      });

      await newUser.save();
      console.log(`✅ Created ${userData.role}: ${userData.username} (${userData.email})`);
    }

    console.log('\n📋 Test Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 USER ROLE:');
    console.log('   Email: testuser@example.com');
    console.log('   Password: password123');
    console.log('   Expected: Redirect to /admin/eagle-nest, limited sidebar');
    console.log('');
    console.log('👨‍💼 ADMIN ROLE:'); 
    console.log('   Email: testadmin@example.com');
    console.log('   Password: password123');
    console.log('   Expected: Full access, cannot create admin roles');
    console.log('');
    console.log('👑 SUPER ADMIN ROLE:');
    console.log('   Email: testsuperadmin@example.com'); 
    console.log('   Password: password123');
    console.log('   Expected: Complete access, can create all roles');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n🧪 Access Control Test Plan:');
    console.log('1. Login as testuser → should see only Eagle Nest in sidebar');
    console.log('2. Login as testadmin → should see all features, cannot create admin roles');
    console.log('3. Login as testsuperadmin → should have complete access');
    console.log('4. Try direct URLs while logged in as user (should be blocked)');
    console.log('5. Test user management role creation restrictions');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
createTestUsers();