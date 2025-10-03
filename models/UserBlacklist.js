// models/UserBlacklist.js
const mongoose = require('mongoose');

const userBlacklistSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    reason: { type: String, default: 'No reason provided.' },
    blacklistedBy: { type: String, required: true }, // User ID of who blacklisted
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('UserBlacklist', userBlacklistSchema);