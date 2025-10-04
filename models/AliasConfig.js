// models/AliasConfig.js
const mongoose = require('mongoose');

const aliasConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    aliases: {
        type: Map, // Store aliases as a Map: 'alias' -> 'commandName'
        of: String,
        default: new Map()
    },
    // Example for auto-role aliases like 'staff' -> 'roleId'
    autoRoleAliases: {
        type: Map, // Store auto-role aliases: 'alias' -> 'roleId'
        of: String,
        default: new Map()
    }
});

module.exports = mongoose.model('AliasConfig', aliasConfigSchema);