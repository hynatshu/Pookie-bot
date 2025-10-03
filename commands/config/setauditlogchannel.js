// commands/config/setauditlogchannel.js
const { errorEmbed, successEmbed, helpEmbed } = require('../../utils/embeds');
const { isModerator, checkDiscordPermissions } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
    name: 'setauditlogchannel',
    aliases: ['setlogchannel', 'auditlog'],
    description: 'Sets the channel where moderation actions will be logged.',
    usage: '`!setauditlogchannel <#channel|channelID|disable>`',
    category: 'Config',
    permissions: ['ManageGuild'],

    async execute(message, args, client, guildConfig) {
        // --- Permission Checks ---
        const missingDiscordPerms = checkDiscordPermissions(message.member, this.permissions);
        if (missingDiscordPerms.length > 0) {
            return message.reply({
                embeds: [errorEmbed(
                    `You are missing the following Discord permissions: \`${missingDiscordPerms.join(', ')}\`.`,
                    `Please ensure you have these permissions to use the \`${this.name}\` command.`
                )]
            }).catch(console.error);
        }

        if (!await isModerator(message, this.permissions)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] }).catch(console.error);
        }

        if (args.length < 1) {
            const currentLogChannel = guildConfig.auditLogChannelId
                ? message.guild.channels.cache.get(guildConfig.auditLogChannelId)?.name || `\`Unknown Channel (ID: ${guildConfig.auditLogChannelId})\``
                : 'None';
            return message.reply({
                embeds: [helpEmbed(
                    this.name, this.usage, this.description, this.aliases
                ).addFields({ name: 'Current Audit Log Channel', value: currentLogChannel })]
            }).catch(console.error);
        }

        const input = args[0].toLowerCase();

        if (input === 'disable') {
            guildConfig.auditLogChannelId = null;
            await guildConfig.save();
            return message.reply({ embeds: [successEmbed('Audit log channel has been disabled.')] }).catch(console.error);
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(input);

        if (!channel || !channel.isTextBased()) {
            return message.reply({ embeds: [errorEmbed('Invalid channel provided.', 'Please mention a text channel or provide a valid channel ID.')] }).catch(console.error);
        }

        // Check if bot can send messages in this channel
        if (!channel.permissionsFor(client.user).has('SendMessages')) {
            return message.reply({ embeds: [errorEmbed(`Pookie does not have permission to send messages in ${channel.name}.`, `Please grant Pookie the "Send Messages" permission in this channel.`)] }).catch(console.error);
        }

        guildConfig.auditLogChannelId = channel.id;
        await guildConfig.save();

        await message.reply({ embeds: [successEmbed(`Audit log channel has been set to ${channel}.`)] }).catch(console.error);
    },
};