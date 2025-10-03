// commands/moderation/mute.js
const { errorEmbed, successEmbed, helpEmbed, warningEmbed } = require('../../utils/embeds');
const { isModerator, checkDiscordPermissions } = require('../../utils/permissions');
const { logToAuditChannel } = require('../../utils/logger');
const ModLog = require('../../models/ModLog');
const ms = require('ms'); // npm install ms

module.exports = {
    name: 'mute',
    aliases: ['timeout', 'shush'],
    description: 'Mutes (timeouts) a member for a specified duration.',
    usage: '`!mute <@user|userID> <duration> [reason]`\n`Duration examples: 1h, 30m, 1d`',
    category: 'Moderation',
    permissions: ['ModerateMembers'], // Discord permission for timeout

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

        if (args.length < 2) {
            return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
        }

        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) {
            return message.reply({ embeds: [errorEmbed('Could not find that user.', 'Please mention a user or provide a valid user ID.')] }).catch(console.error);
        }

        if (target.id === message.author.id) {
            return message.reply({ embeds: [warningEmbed('You cannot mute yourself.')] }).catch(console.error);
        }
        if (target.id === client.user.id) {
            return message.reply({ embeds: [warningEmbed('You cannot mute Pookie Bot.')] }).catch(console.error);
        }
        if (target.permissions.has('Administrator') || target.id === message.guild.ownerId) {
            return message.reply({ embeds: [errorEmbed('You cannot mute administrators or the server owner.')] }).catch(console.error);
        }
        if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.reply({ embeds: [errorEmbed('You cannot mute someone with an equal or higher role than yourself.')] }).catch(console.error);
        }
        if (target.roles.highest.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ embeds: [errorEmbed(`I cannot mute ${target.user.tag} because their highest role is equal to or higher than mine.`, "Please ensure Pookie Bot's highest role is above the target user's highest role.")] }).catch(console.error);
        }

        const durationString = args[1];
        const duration = ms(durationString); // Convert string (e.g., "1h") to milliseconds

        if (isNaN(duration) || duration <= 0) {
            return message.reply({ embeds: [errorEmbed('Invalid duration provided.', 'Please use formats like `1h`, `30m`, `1d`.')] }).catch(console.error);
        }

        // Discord API limits timeout to 28 days (2,419,200,000 ms)
        const MAX_TIMEOUT_DURATION = 2419200000;
        if (duration > MAX_TIMEOUT_DURATION) {
            return message.reply({ embeds: [errorEmbed('Duration too long.', 'Discord only allows timeouts up to 28 days.')] }).catch(console.error);
        }

        const reason = args.slice(2).join(' ') || 'No reason provided.';

        try {
            await target.timeout(duration, reason);

            // DM the user
            const dmEmbed = successEmbed(
                `You have been muted in ${message.guild.name} for ${durationString}.`,
                `Reason: ${reason}`
            );
            await target.send({ embeds: [dmEmbed] }).catch(dmError => {
                console.warn(`Could not DM muted user ${target.user.tag}: ${dmError.message}`);
                message.channel.send({ embeds: [warningEmbed(`Could not DM ${target.user.tag} with mute details.`)] }).catch(console.error);
            });

            // Log to database
            const modLog = new ModLog({
                guildId: message.guild.id,
                action: 'Mute (Timeout)',
                targetId: target.id,
                moderatorId: message.author.id,
                reason: reason,
                duration: duration,
                timestamp: new Date()
            });
            await modLog.save();

            // Send confirmation to channel
            await message.reply({ embeds: [successEmbed(`${target.user.tag} has been muted for ${durationString}.`, `Reason: ${reason}`)] }).catch(console.error);

            // Log to audit channel
            await logToAuditChannel(message.guild, 'Member Muted', `${target.user.tag} was muted by ${message.author.tag} for ${durationString}.`, message.author, target.user, '#f1c40f');

        } catch (error) {
            console.error(`Error muting ${target.user.tag}:`, error);
            await message.reply({ embeds: [errorEmbed(`Failed to mute ${target.user.tag}.`, `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
        }
    },
};