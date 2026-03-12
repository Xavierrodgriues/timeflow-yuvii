const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for seeding...');

    const adminEmail = 'yuviiconsultancy@gmail.com';
    const adminPassword = 'Yuvii@1120';
    
    // Check if admin already exists
    let admin = await User.findOne({ email: adminEmail });
    
    if (admin) {
      console.log('Admin user already exists. Updating password and role...');
      admin.password = adminPassword; // Will be hashed by pre-save hook
      admin.role = 'admin';
      await admin.save();
      console.log('Admin user updated successfully.');
    } else {
      console.log('Creating admin user...');
      admin = await User.create({
        name: 'Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      });
      console.log('Admin user created successfully.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
};

seedAdmin();
