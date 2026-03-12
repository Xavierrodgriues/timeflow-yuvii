const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const checkDb = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = 'yuviiconsultancy@gmail.com';
  const password = 'Yuvii@1120';
  
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  
  console.log('User found:', user.email, 'Role:', user.role);
  console.log('Hashed Password in DB:', user.password);
  
  const isMatch = await bcrypt.compare(password, user.password);
  console.log('Password Match:', isMatch);
  
  process.exit(0);
};

checkDb();
