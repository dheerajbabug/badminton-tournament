require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function initAdmin() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const adminExists = await User.findOne({ username: 'admin' });
    if (adminExists) {
        console.log('Admin user already exists.');
    } else {
        const admin = new User({
            username: 'admin',
            password: 'password123' // User should change this later
        });
        await admin.save();
        console.log('Admin user created: admin / password123');
    }
    process.exit();
}

initAdmin().catch(console.error);
