// utils/permissions.js
const { errorEmbed } = require('./embeds');
const GuildConfig = require('../models/GuildConfig');

/**
 * Checks if a member has the required Discord permissions.
 * @param {import('discord.js').GuildMember} member - The member to check.
 * @param {Array<import('discord.js').PermissionResolvable>} permissions - An array of required Discord permissions.
 * @returns {Array<string>} An array of missing permissions, or empty if all are present.
 */
const checkDiscordPermissions = (member, permissions) => {
    const missing = [];
    for (const perm of permissions) {
        if (!member.permissions.has(perm)) {
            missing.push(perm);
        }
    }
    return missing;
};

/**
 * Checks if a member has a configured moderator role or sufficient Discord permissions.
 * @param {import('discord.js').Message} message - The message object.
 * @param {Array<import('discord.js').PermissionResolvable>} discordPerms - Discord permissions needed (e.g., KICK_MEMBERS).
 * @returns {Promise<boolean>} True if authorized, false otherwise.
 */
const isModerator = async (message, discordPerms = []) => {
    if (message.guild.ownerId === message.author.id) return true; // Guild owner always has access

    const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
    if (guildConfig && guildConfig.modRoles.some(roleId => message.member.roles.cache.has(roleId))) {
        return true; // Has a configured moderator role
    }

    const missingDiscordPerms = checkDiscordPermissions(message.member, discordPerms);
    if (missingDiscordPerms.length === 0) {
        return true; // Has all required Discord permissions
    }

    return false;
};

module.exports = {
    checkDiscordPermissions,
    isModerator
};