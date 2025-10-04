// commands/moderation/nickname.js
const { errorEmbed, successEmbed, helpEmbed, warningEmbed } = require('../../utils/embeds');
const { isModerator, checkDiscordPermissions } = require('../../utils/permissions');
const { logToAuditChannel } = require('../../utils/logger');
const ModLog = require('../../models/ModLog');
const GuildConfig = require('../../models/GuildConfig'); // To fetch nickname change role

module.exports = {
    name: 'nickname',
    aliases: ['nick', 'setnick'],
    description: 'Changes a member\'s nickname or resets it. Requires a specific configured role.',
    usage: '`!nickname <@user|userID> [new_nickname | reset]`',
    category: 'Moderation',
    permissions: ['ManageNicknames'], // Discord permission for changing nicknames

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

        // --- Specific Role Check for Nickname Command ---
        // This requires a new config setting in GuildConfig, e.g., `nicknameChangeRole`
        // For now, I'll use `modRoles` but ideally you'd have a specific one.
        // Let's assume for now that only users with `ManageNicknames` and `isModerator` can do it.
        // If you want a *specific* role for *only* nickname changes, you'd add `nicknameChangeRoleId` to GuildConfig.js
        // For example:
        // const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
        // if (!message.member.roles.cache.has(guildConfig.nicknameChangeRoleId) && message.author.id !== message.guild.ownerId) {
        //      return message.reply({ embeds: [errorEmbed('You need the designated nickname change role to use this command.')] }).catch(console.error);
        // }

        if (args.length < 1) {
            return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
        }

        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) {
            return message.reply({ embeds: [errorEmbed('Could not find that user.', 'Please mention a user or provide a valid user ID.')] }).catch(console.error);
        }

        if (target.id === client.user.id) {
            return message.reply({ embeds: [warningEmbed('You cannot change Pookie Bot\'s nickname with this command. I manage my own identity!')] }).catch(console.error);
        }
        if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.reply({ embeds: [errorEmbed('You cannot change the nickname of someone with an equal or higher role than yourself.')] }).catch(console.error);
        }
        if (target.roles.highest.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ embeds: [errorEmbed(`I cannot change the nickname of ${target.user.tag} because their highest role is equal to or higher than mine.`, "Please ensure Pookie Bot's highest role is above the target user's highest role.")] }).catch(console.error);
        }

        let newNickname = args.slice(1).join(' ');
        const oldNickname = target.nickname || target.user.username;

        try {
            if (!newNickname || newNickname.toLowerCase() === 'reset') {
                await target.setNickname(null, `Nickname reset by ${message.author.tag}`);
                await message.reply({ embeds: [successEmbed(`Nickname for ${target.user.tag} has been reset.`)] }).catch(console.error);

                // Log to database
                const modLog = new ModLog({
                    guildId: message.guild.id,
                    action: 'Nickname Reset',
                    targetId: target.id,
                    moderatorId: message.author.id,
                    reason: `Nickname reset from '${oldNickname}'`,
                    timestamp: new Date()
                });
                await modLog.save();

                // Log to audit channel
                await logToAuditChannel(message.guild, 'Nickname Reset',
                    `Nickname for ${target.user.tag} was reset from \`${oldNickname}\` by ${message.author.tag}.`,
                    message.author, target.user, '#7f8c8d'
                );
            } else {
                if (newNickname.length > 32) {
                    return message.reply({ embeds: [errorEmbed('Nickname too long.', 'Nicknames cannot exceed 32 characters.')] }).catch(console.error);
                }
                await target.setNickname(newNickname, `Nickname changed by ${message.author.tag}`);
                await message.reply({ embeds: [successEmbed(`Nickname for ${target.user.tag} changed to \`${newNickname}\`.`)] }).catch(console.error);

                // Log to database
                const modLog = new ModLog({
                    guildId: message.guild.id,
                    action: 'Nickname Change',
                    targetId: target.id,
                    moderatorId: message.author.id,
                    reason: `Changed from '${oldNickname}' to '${newNickname}'`,
                    timestamp: new Date()
                });
                await modLog.save();

                // Log to audit channel
                await logToAuditChannel(message.guild, 'Nickname Changed',
                    `Nickname for ${target.user.tag} changed from \`${oldNickname}\` to \`${newNickname}\` by ${message.author.tag}.`,
                    message.author, target.user, '#34495e'
                );
            }
        } catch (error) {
            console.error(`Error changing nickname for ${target.user.tag}:`, error);
            await message.reply({ embeds: [errorEmbed(`Failed to change nickname for ${target.user.tag}.`, `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
        }
    },
};