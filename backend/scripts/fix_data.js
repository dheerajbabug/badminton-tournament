require('dotenv').config();
const mongoose = require('mongoose');
const Participant = require('../models/Participant');

async function fixCategories() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Fix those without category or with string 'undefined'
    const res1 = await Participant.updateMany(
        { $or: [{ category: { $exists: false } }, { category: 'undefined' }, { category: null }] },
        { $set: { category: "Men's Singles" } }
    );

    console.log(`Updated ${res1.modifiedCount} participants to Men's Singles.`);
    process.exit();
}

fixCategories().catch(console.error);
