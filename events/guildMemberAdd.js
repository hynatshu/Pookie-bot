// events/guildMemberAdd.js
const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const { warningEmbed } = require('../utils/embeds');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });
        if (guildConfig && guildConfig.autoRole.enabled && guildConfig.autoRole.roleId) {
            try {
                const role = member.guild.roles.cache.get(guildConfig.autoRole.roleId);
                if (role) {
                    await member.roles.add(role, 'Pookie Auto-Role');
                } else {
                    // Optionally log if role not found
                    console.warn(`Auto-role configured but role ${guildConfig.autoRole.roleId} not found in guild ${member.guild.name}`);
                }
            } catch (error) {
                console.error(`Failed to assign auto-role to ${member.user.tag} in ${member.guild.name}:`, error);
                // Optionally log this to an audit channel if configured
            }
        }

        // Custom Welcome DM (Optional, can be configured via DB)
        // For demonstration, a simple DM:
        try {
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`Welcome to ${member.guild.name}!`)
                .setDescription(`Hello ${member.user.username}, we're glad to have you here!`)
                .setTimestamp()
                .setFooter({ text: 'Pookie Bot' });

            await member.send({ embeds: [welcomeEmbed] });
        } catch (dmError) {
            console.warn(`Could not DM ${member.user.tag} on join (DMs likely closed).`);
            // Optionally send a message to a public channel
            // member.guild.channels.cache.find(ch => ch.name.includes('welcome'))?.send(`Welcome ${member.user}!`).catch(() => {});
        }
    },
};