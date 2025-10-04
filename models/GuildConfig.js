// models/GuildConfig.js
const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    auditLogChannelId: { type: String, default: null },
    modRoles: [{ type: String }], // Array of role IDs that can use mod commands
    autoRole: {
        roleId: { type: String, default: null },
        enabled: { type: Boolean, default: false }
    },
    inVCRole: {
        roleId: { type: String, default: null },
        enabled: { type: Boolean, default: false }
    },
    cmdBlacklistedChannels: [{ type: String }], // Channels where commands are blacklisted
    // Add other guild-specific configurations here
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);