// commands/moderation/slowmode.js
const { errorEmbed, successEmbed, helpEmbed, warningEmbed } = require('../../utils/embeds');
const { isModerator, checkDiscordPermissions } = require('../../utils/permissions');
const { logToAuditChannel } = require('../../utils/logger');
const ModLog = require('../../models/ModLog');
const ms = require('ms'); // npm install ms

module.exports = {
    name: 'slowmode',
    aliases: ['sm', 'setdelay'],
    description: 'Sets or removes slowmode for a channel.',
    usage: '`!slowmode <duration> [#channel|channelID]`\n`Duration examples: 0s (to disable), 5s, 1m, 2h`',
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

        if (args.length < 1) {
            return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
        }

        const durationString = args[0];
        const rawDuration = ms(durationString) / 1000; // Convert to seconds

        if (isNaN(rawDuration) || rawDuration < 0 || rawDuration > 21600) { // Max 6 hours = 21600 seconds
            return message.reply({
                embeds: [errorEmbed(
                    'Invalid duration provided.',
                    'Please use formats like `0s` (to disable), `5s`, `1m`, `2h`. Max duration is 6 hours.'
                )]
            }).catch(console.error);
        }

        let channel = message.channel; // Default to current channel
        let reason = 'No reason provided.';

        if (args.length > 1) {
            const potentialChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
            if (potentialChannel && potentialChannel.isTextBased()) {
                channel = potentialChannel;
                reason = args.slice(2).join(' ') || 'No reason provided.';
            } else {
                reason = args.slice(1).join(' ') || 'No reason provided.'; // If 2nd arg isn't a channel, it's part of the reason
            }
        }

        // Ensure the bot can manage permissions for this channel
        if (!channel.permissionsFor(client.user).has('ManageChannels')) {
            return message.reply({ embeds: [errorEmbed(`Pookie does not have permission to manage channel permissions for ${channel.name}.`, `Please ensure Pookie Bot has the "Manage Channels" permission for this channel.`)] }).catch(console.error);
        }

        try {
            await channel.setRateLimitPerUser(rawDuration, `Slowmode set by ${message.author.tag} | Reason: ${reason}`);

            const action = rawDuration === 0 ? 'Disabled Slowmode' : `Set Slowmode to ${durationString}`;
            const description = rawDuration === 0 ? `Slowmode has been disabled in ${channel.name}.` : `Slowmode for ${channel.name} set to **${durationString}**.`;

            await message.reply({ embeds: [successEmbed(action, description)] }).catch(console.error);

            // Log to database
            const modLog = new ModLog({
                guildId: message.guild.id,
                action: 'Slowmode',
                targetId: channel.id, // Target is the channel
                moderatorId: message.author.id,
                reason: reason,
                duration: rawDuration * 1000, // Store in ms
                timestamp: new Date(),
                channelId: channel.id
            });
            await modLog.save();

            // Log to audit channel
            await logToAuditChannel(message.guild, action,
                `${channel.name} slowmode was ${rawDuration === 0 ? 'disabled' : `set to ${durationString}`} by ${message.author.tag}.`,
                message.author, null, '#1abc9c'
            );

        } catch (error) {
            console.error(`Error setting slowmode in ${channel.name}:`, error);
            await message.reply({ embeds: [errorEmbed(`Failed to set slowmode in ${channel.name}.`, `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
        }
    },
};