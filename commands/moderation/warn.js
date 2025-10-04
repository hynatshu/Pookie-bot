// commands/moderation/warn.js
const { errorEmbed, successEmbed, helpEmbed } = require('../../utils/embeds');
const { isModerator, checkDiscordPermissions } = require('../../utils/permissions');
const { logToAuditChannel } = require('../../utils/logger');
const ModLog = require('../../models/ModLog');

module.exports = {
    name: 'warn',
    aliases: ['w'],
    description: 'Warns a member.',
    usage: '`!warn <@user|userID> [reason]`',
    category: 'Moderation',
    permissions: ['KickMembers'], // Discord permissions needed

    async execute(message, args, client, guildConfig) {
        // --- Permission Check ---
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

        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);

        if (!target) {
            return message.reply({ embeds: [errorEmbed('Could not find that user.', 'Please mention a user or provide a valid user ID.')] }).catch(console.error);
        }

        if (target.id === message.author.id) {
            return message.reply({ embeds: [warningEmbed('You cannot warn yourself.')] }).catch(console.error);
        }
        if (target.id === client.user.id) {
            return message.reply({ embeds: [warningEmbed('You cannot warn Pookie Bot.')] }).catch(console.error);
        }
        if (target.permissions.has('Administrator') || target.id === message.guild.ownerId) {
            return message.reply({ embeds: [errorEmbed('You cannot warn administrators or the server owner.')] }).catch(console.error);
        }
        // Check hierarchy
        if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.reply({ embeds: [errorEmbed('You cannot warn someone with an equal or higher role than yourself.')] }).catch(console.error);
        }
        if (target.roles.highest.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ embeds: [errorEmbed(`I cannot warn ${target.user.tag} because their highest role is equal to or higher than mine.`, "Please ensure Pookie Bot's highest role is above the target user's highest role.")] }).catch(console.error);
        }


        const reason = args.slice(1).join(' ') || 'No reason provided.';

        try {
            // DM the user
            const dmEmbed = successEmbed(
                `You have been warned in ${message.guild.name}.`,
                `Reason: ${reason}`
            );
            await target.send({ embeds: [dmEmbed] }).catch(dmError => {
                console.warn(`Could not DM warned user ${target.user.tag}: ${dmError.message}`);
                message.channel.send({ embeds: [warningEmbed(`Could not DM ${target.user.tag} with warning details.`)] }).catch(console.error);
            });

            // Log to database
            const modLog = new ModLog({
                guildId: message.guild.id,
                action: 'Warn',
                targetId: target.id,
                moderatorId: message.author.id,
                reason: reason,
                timestamp: new Date()
            });
            await modLog.save();

            // Send confirmation to channel
            await message.reply({ embeds: [successEmbed(`${target.user.tag} has been warned.`, `Reason: ${reason}`)] }).catch(console.error);

            // Log to audit channel
            await logToAuditChannel(message.guild, 'Member Warned', `${target.user.tag} was warned by ${message.author.tag}.`, message.author, target.user, '#f39c12');

        } catch (error) {
            console.error(`Error warning ${target.user.tag}:`, error);
            await message.reply({ embeds: [errorEmbed(`Failed to warn ${target.user.tag}.`, `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
        }
    },
};