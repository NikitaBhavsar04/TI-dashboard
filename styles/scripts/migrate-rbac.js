const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Update this with your actual MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://threatadvisory:7U%402dRJagX5kFXE@threatadvisory.atzvfoo.mongodb.net/threat-advisory?retryWrites=true&w=majority';

async function migrateRoles() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const users = db.collection('users');
    
    // Find all current admin users
    const adminUsers = await users.find({ role: 'admin' }).toArray();
    console.log(`📊 Found ${adminUsers.length} admin users`);
    
    if (adminUsers.length > 0) {
      console.log('\\n📋 Existing admin users:');
      adminUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.username || 'No username'})`);
      });
      
      // Convert first admin to super_admin
      const firstAdmin = adminUsers[0];
      console.log(`\\n🔄 Converting ${firstAdmin.email} to super_admin...`);
      
      await users.updateOne(
        { _id: firstAdmin._id },
        { 
          $set: { 
            role: 'super_admin', 
            updatedAt: new Date() 
          } 
        }
      );
      
      console.log('✅ Successfully converted to super_admin');
      
      // Other admins remain as limited admins
      if (adminUsers.length > 1) {
        console.log(`\\n📝 ${adminUsers.length - 1} other admin users will retain admin role with limited permissions`);
        console.log('   These users can now only:');
        console.log('   - Create user accounts (not admin/super_admin)');
        console.log('   - View audit logs');
        console.log('   - Cannot see client email addresses');
        console.log('   - Cannot delete clients');
      }
    } else {
      console.log('\\n⚠️  No existing admin users found. Creating default super_admin...');
      
      const defaultSuperAdmin = {
        username: 'superadmin',
        email: 'superadmin@threatadvisory.com',
        password: await bcrypt.hash('SuperAdmin123!', 12),
        role: 'super_admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      };
      
      await users.insertOne(defaultSuperAdmin);
      console.log('✅ Created default super_admin user');
      console.log('\\n🔐 Default Super Admin Credentials:');
      console.log('   Email: superadmin@threatadvisory.com');
      console.log('   Password: SuperAdmin123!');
      console.log('   ⚠️  IMPORTANT: Change this password after first login!');
    }
    
    // Create audit logs collection with indexes
    console.log('\\n🗂️  Setting up audit logs collection...');
    const auditLogs = db.collection('auditlogs');
    
    // Create indexes for better performance
    const indexes = [
      { key: { timestamp: -1 }, name: 'timestamp_desc' },
      { key: { userId: 1 }, name: 'userId_asc' },
      { key: { action: 1 }, name: 'action_asc' },
      { key: { resource: 1 }, name: 'resource_asc' },
      { key: { resourceId: 1 }, name: 'resourceId_asc' }
    ];
    
    for (const index of indexes) {
      try {
        await auditLogs.createIndex(index.key, { name: index.name });
        console.log(`   ✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`   ℹ️  Index already exists: ${index.name}`);
        } else {
          console.log(`   ❌ Failed to create index ${index.name}:`, error.message);
        }
      }
    }
    
    // Verify role hierarchy is working
    console.log('\\n🔍 Verifying role distribution:');
    const roleStats = await users.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    roleStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} users`);
    });
    
    console.log('\\n✅ Migration completed successfully!');
    console.log('\\n📋 Role Permissions Summary:');
    console.log('   🟣 SUPER_ADMIN:');
    console.log('      - Full system access');
    console.log('      - Can create/manage any user role');
    console.log('      - Can see all client email addresses');
    console.log('      - Can delete clients');
    console.log('      - Full audit log access');
    console.log('\\n   🔵 ADMIN:');
    console.log('      - Can create user accounts only');
    console.log('      - Cannot create admin/super_admin accounts');
    console.log('      - Cannot see client email addresses');
    console.log('      - Cannot delete clients');
    console.log('      - Can view audit logs');
    console.log('\\n   🟢 USER:');
    console.log('      - Standard user permissions (unchanged)');
    console.log('      - Can view advisories');
    console.log('      - Can update own profile');
    
    console.log('\\n🚀 Next Steps:');
    console.log('   1. Deploy the updated application code');
    console.log('   2. Test login with the super_admin account');
    console.log('   3. Create additional admin users as needed');
    console.log('   4. Update any existing admin user passwords');
    console.log('   5. Verify role-based access controls are working');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\\n🔌 Database connection closed');
  }
}

// Run the migration
console.log('🚀 Starting Role-Based Access Control (RBAC) Migration...');
console.log('================================================\\n');

migrateRoles().then(() => {
  console.log('\\n🎉 Migration completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('\\n💥 Migration failed:', error);
  process.exit(1);
});
