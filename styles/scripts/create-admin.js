const dbConnect = require('../lib/db').default;
const User = require('../models/User').default;

async function createInitialAdmin() {
  await dbConnect();

  try {
    // Check if any admin user exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    // Create initial admin user
    const admin = new User({
      username: 'admin',
      email: 'admin@threatwatch.com',
      password: 'admin123', // Change this in production
      role: 'admin',
      createdBy: 'system'
    });

    await admin.save();
    console.log('Initial admin user created successfully!');
    console.log('Email: admin@threatwatch.com');
    console.log('Password: admin123');
    console.log('Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createInitialAdmin();
