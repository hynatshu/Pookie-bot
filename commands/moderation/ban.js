// commands/moderation/ban.js
const { errorEmbed, successEmbed, helpEmbed, warningEmbed } = require('../../utils/embeds');
const { isModerator, checkDiscordPermissions } = require('../../utils/permissions');
const { logToAuditChannel } = require('../../utils/logger');
const ModLog = require('../../models/ModLog');

module.exports = {
    name: 'ban',
    aliases: ['permban', 'hammer'],
    description: 'Bans a member from the server.',
    usage: '`!ban <@user|userID> [reason]`',
    category: 'Moderation',
    permissions: ['BanMembers'],

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

        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) {
            // If user isn't in guild, can still ban by ID
            const userId = args[0];
            const user = await client.users.fetch(userId).catch(() => null);
            if (!user) {
                return message.reply({ embeds: [errorEmbed('Could not find that user.', 'Please mention a user, provide a valid user ID, or ensure the user exists.')] }).catch(console.error);
            }
            // Proceed to ban by ID
            const reason = args.slice(1).join(' ') || 'No reason provided (banned by ID).';
            try {
                // DM user *before* ban if possible (if they are still in guild or we can fetch their DM channel)
                const dmEmbed = successEmbed(
                    `You have been banned from ${message.guild.name}.`,
                    `Reason: ${reason}`
                );
                await user.send({ embeds: [dmEmbed] }).catch(dmError => {
                    console.warn(`Could not DM banned user ${user.tag}: ${dmError.message}`);
                    message.channel.send({ embeds: [warningEmbed(`Could not DM ${user.tag} with ban details (user not in guild or DMs closed).`)] }).catch(console.error);
                });

                await message.guild.members.ban(userId, { reason });

                const modLog = new ModLog({
                    guildId: message.guild.id,
                    action: 'Ban',
                    targetId: userId,
                    moderatorId: message.author.id,
                    reason: reason,
                    timestamp: new Date()
                });
                await modLog.save();

                await message.reply({ embeds: [successEmbed(`${user.tag} (ID: ${userId}) has been banned.`, `Reason: ${reason}`)] }).catch(console.error);
                await logToAuditChannel(message.guild, 'Member Banned (ID)', `${user.tag} (ID: ${userId}) was banned by ${message.author.tag}.`, message.author, user, '#e74c3c');
                return;

            } catch (error) {
                console.error(`Error banning user ID ${userId}:`, error);
                await message.reply({ embeds: [errorEmbed(`Failed to ban user ID ${userId}.`, `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
                return;
            }
        }

        // If target is in the guild (Member object)
        if (target.id === message.author.id) {
            return message.reply({ embeds: [warningEmbed('You cannot ban yourself.')] }).catch(console.error);
        }
        if (target.id === client.user.id) {
            return message.reply({ embeds: [warningEmbed('You cannot ban Pookie Bot.')] }).catch(console.error);
        }
        if (target.permissions.has('Administrator') || target.id === message.guild.ownerId) {
            return message.reply({ embeds: [errorEmbed('You cannot ban administrators or the server owner.')] }).catch(console.error);
        }
        if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.reply({ embeds: [errorEmbed('You cannot ban someone with an equal or higher role than yourself.')] }).catch(console.error);
        }
        if (target.roles.highest.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ embeds: [errorEmbed(`I cannot ban ${target.user.tag} because their highest role is equal to or higher than mine.`, "Please ensure Pookie Bot's highest role is above the target user's highest role.")] }).catch(console.error);
        }

        const reason = args.slice(1).join(' ') || 'No reason provided.';

        try {
            // DM the user
            const dmEmbed = successEmbed(
                `You have been banned from ${message.guild.name}.`,
                `Reason: ${reason}`
            );
            await target.send({ embeds: [dmEmbed] }).catch(dmError => {
                console.warn(`Could not DM banned user ${target.user.tag}: ${dmError.message}`);
                message.channel.send({ embeds: [warningEmbed(`Could not DM ${target.user.tag} with ban details.`)] }).catch(console.error);
            });

            await target.ban({ reason });

            // Log to database
            const modLog = new ModLog({
                guildId: message.guild.id,
                action: 'Ban',
                targetId: target.id,
                moderatorId: message.author.id,
                reason: reason,
                timestamp: new Date()
            });
            await modLog.save();

            // Send confirmation to channel
            await message.reply({ embeds: [successEmbed(`${target.user.tag} has been banned.`, `Reason: ${reason}`)] }).catch(console.error);

            // Log to audit channel
            await logToAuditChannel(message.guild, 'Member Banned', `${target.user.tag} was banned by ${message.author.tag}.`, message.author, target.user, '#e74c3c');

        } catch (error) {
            console.error(`Error banning ${target.user.tag}:`, error);
            await message.reply({ embeds: [errorEmbed(`Failed to ban ${target.user.tag}.`, `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
        }
    },
};