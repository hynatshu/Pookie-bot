// events/voiceStateUpdate.js
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        const guild = newState.guild || oldState.guild;
        if (!guild) return;

        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;

        const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
        if (!guildConfig || !guildConfig.inVCRole.enabled || !guildConfig.inVCRole.roleId) return;

        const inVCRole = guild.roles.cache.get(guildConfig.inVCRole.roleId);
        if (!inVCRole) return; // Role not found

        // User joined a voice channel
        if (!oldState.channelId && newState.channelId) {
            try {
                if (!member.roles.cache.has(inVCRole.id)) {
                    await member.roles.add(inVCRole, 'Joined Voice Channel');
                }
            } catch (error) {
                console.error(`Failed to add in-VC role to ${member.user.tag}:`, error);
            }
        }
        // User left a voice channel
        else if (oldState.channelId && !newState.channelId) {
            try {
                if (member.roles.cache.has(inVCRole.id)) {
                    await member.roles.remove(inVCRole, 'Left Voice Channel');
                }
            } catch (error) {
                console.error(`Failed to remove in-VC role from ${member.user.tag}:`, error);
            }
        }
    },
};