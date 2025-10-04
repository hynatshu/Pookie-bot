// utils/logger.js
const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

/**
 * Sends a log message to the configured audit log channel.
 * @param {import('discord.js').Guild} guild - The guild where the action occurred.
 * @param {string} title - The title for the log embed.
 * @param {string} description - The description for the log embed.
 * @param {import('discord.js').User | null} responsibleUser - The user who initiated the action.
 * @param {import('discord.js').User | null} targetUser - The user who was affected (if applicable).
 * @param {string} color - Hex color for the embed.
 */
const logToAuditChannel = async (guild, title, description, responsibleUser = null, targetUser = null, color = '#3498db') => {
    const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
    if (!guildConfig || !guildConfig.auditLogChannelId) return;

    const auditChannel = guild.channels.cache.get(guildConfig.auditLogChannelId);
    if (!auditChannel || !auditChannel.isTextBased()) return;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: 'Pookie Bot Audit Log' });

    if (responsibleUser) {
        embed.addFields({ name: 'Responsible User', value: `${responsibleUser.tag} (${responsibleUser.id})`, inline: true });
    }
    if (targetUser) {
        embed.addFields({ name: 'Target User', value: `${targetUser.tag} (${targetUser.id})`, inline: true });
    }

    try {
        await auditChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`Failed to send audit log to channel ${auditChannel.id} in guild ${guild.name}:`, error);
    }
};

module.exports = { logToAuditChannel };