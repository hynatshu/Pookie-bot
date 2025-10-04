// utils/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected!');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1); // Exit process if DB connection fails
    }
};

module.exports = { connectDB };