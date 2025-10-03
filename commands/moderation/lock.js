// commands/moderation/lock.js
const { errorEmbed, successEmbed, helpEmbed, warningEmbed } = require('../../utils/embeds');
const { isModerator, checkDiscordPermissions } = require('../../utils/permissions');
const { logToAuditChannel } = require('../../utils/logger');
const ModLog = require('../../models/ModLog');

module.exports = {
    name: 'lock',
    aliases: ['lockdown'],
    description: 'Locks the current channel or a specified channel, preventing @everyone from sending messages.',
    usage: '`!lock [#channel|channelID] [reason]`',
    category: 'Moderation',
    permissions: ['ManageChannels'],

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
        const botMissingPerms = checkDiscordPermissions(message.guild.members.me, this.permissions);
        if (botMissingPerms.length > 0) {
            return message.reply({
                embeds: [errorEmbed(
                    `Pookie is missing the following Discord permissions to perform this action: \`${botMissingPerms.join(', ')}\`.`,
                    `Please grant Pookie these permissions.`
                )]
            }).catch(console.error);
        }

        if (!await isModerator(message, this.permissions)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] }).catch(console.error);
        }

        let channel = message.channel; // Default to current channel
        let reason = args.join(' ') || 'No reason provided.';

        if (args.length > 0) {
            const potentialChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
            if (potentialChannel && potentialChannel.isTextBased()) {
                channel = potentialChannel;
                reason = args.slice(1).join(' ') || 'No reason provided.';
            }
        }

        // Ensure the bot can manage permissions for this channel
        if (!channel.permissionsFor(client.user).has('ManageChannels')) {
            return message.reply({ embeds: [errorEmbed(`Pookie does not have permission to manage channel permissions for ${channel.name}.`, `Please ensure Pookie Bot has the "Manage Channels" permission for this channel.`)] }).catch(console.error);
        }

        try {
            // Check current permission state
            const everyoneRole = message.guild.roles.everyone;
            const currentPerms = channel.permissionsFor(everyoneRole);

            if (currentPerms.has('SendMessages') === false) {
                return message.reply({ embeds: [warningEmbed(`${channel.name} is already locked.`)] }).catch(console.error);
            }

            // Deny send messages permission for @everyone
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false
            }, { type: 0, reason: `Channel locked by ${message.author.tag} | Reason: ${reason}` });

            await message.reply({ embeds: [successEmbed(`${channel.name} has been locked.`, `Reason: ${reason}`)] }).catch(console.error);

            // Log to database
            const modLog = new ModLog({
                guildId: message.guild.id,
                action: 'Channel Lock',
                targetId: channel.id, // Target is the channel
                moderatorId: message.author.id,
                reason: reason,
                timestamp: new Date(),
                channelId: channel.id
            });
            await modLog.save();

            // Log to audit channel
            await logToAuditChannel(message.guild, 'Channel Locked', `${channel.name} was locked by ${message.author.tag}.`, message.author, null, '#3498db');

        } catch (error) {
            console.error(`Error locking channel ${channel.name}:`, error);
            await message.reply({ embeds: [errorEmbed(`Failed to lock ${channel.name}.`, `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
        }
    },
};