// models/ModLog.js
const mongoose = require('mongoose');

const modLogSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    action: { type: String, required: true }, // e.g., 'Warn', 'Mute', 'Kick', 'Ban', 'Lock', 'Hide', 'Nickname Change'
    targetId: { type: String, required: true }, // The user affected
    moderatorId: { type: String, required: true }, // The user who performed the action
    reason: { type: String, default: 'No reason provided.' },
    duration: { type: Number, default: null }, // For mute/timeout in milliseconds
    timestamp: { type: Date, default: Date.now },
    channelId: { type: String, default: null }, // For lock/hide
});

module.exports = mongoose.model('ModLog', modLogSchema);