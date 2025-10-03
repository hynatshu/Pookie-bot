// commands/moderation/roleall.js
const { errorEmbed, successEmbed, helpEmbed, warningEmbed } = require('../../utils/embeds');
const { isModerator, checkDiscordPermissions } = require('../../utils/permissions');
const { logToAuditChannel } = require('../../utils/logger');
const ModLog = require('../../models/ModLog');

module.exports = {
    name: 'roleall',
    aliases: ['giveroleall', 'addroleall'],
    description: 'Assigns a specified role to all *human* members in the server.',
    usage: '`!roleall <@role|roleID|roleName>`',
    category: 'Moderation',
    permissions: ['ManageRoles'],

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

        const roleIdentifier = args.join(' ');
        const role = message.mentions.roles.first() ||
            message.guild.roles.cache.get(roleIdentifier) ||
            message.guild.roles.cache.find(r => r.name.toLowerCase() === roleIdentifier.toLowerCase());

        if (!role) {
            return message.reply({ embeds: [errorEmbed('Could not find that role.', 'Please mention a role, provide a valid role ID, or the exact role name.')] }).catch(console.error);
        }

        // Check role hierarchy
        if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.reply({ embeds: [errorEmbed('You cannot give a role that is equal to or higher than your highest role.')] }).catch(console.error);
        }
        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ embeds: [errorEmbed(`I cannot give the role \`${role.name}\` because it is equal to or higher than my highest role.`, "Please ensure Pookie Bot's highest role is above the role you are trying to assign.")] }).catch(console.error);
        }

        const confirmationEmbed = warningEmbed(
            `Are you sure you want to assign the role \`${role.name}\` to **all human members** in this server?`,
            'This action cannot be undone easily. React with ✅ to confirm, or ❌ to cancel.'
        );

        const confirmMessage = await message.reply({ embeds: [confirmationEmbed] });
        await confirmMessage.react('✅');
        await confirmMessage.react('❌');

        const filter = (reaction, user) => ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
        try {
            const collected = await confirmMessage.awaitReactions({ filter, max: 1, time: 30000, errors: ['time'] });
            const reaction = collected.first();

            if (reaction.emoji.name === '❌') {
                await confirmMessage.delete();
                return message.reply({ embeds: [errorEmbed('Roleall command cancelled.')] }).catch(console.error);
            }
            await confirmMessage.delete();

        } catch (collected) {
            await confirmMessage.delete();
            return message.reply({ embeds: [errorEmbed('Roleall command timed out. Please try again.')] }).catch(console.error);
        }

        let addedCount = 0;
        let failedCount = 0;
        const allMembers = await message.guild.members.fetch(); // Fetch all members

        await message.channel.send({ embeds: [warningEmbed(`Attempting to assign \`${role.name}\` to all human members. This may take a while for large servers.`, 'Progress will be updated here.')] }).catch(console.error);

        for (const [memberId, member] of allMembers) {
            if (!member.user.bot) { // Only target human members
                try {
                    if (!member.roles.cache.has(role.id)) { // Only add if they don't already have it
                        await member.roles.add(role, `Roleall by ${message.author.tag}`);
                        addedCount++;
                    }
                } catch (error) {
                    console.error(`Failed to add role ${role.name} to ${member.user.tag}:`, error);
                    failedCount++;
                }
            }
        }

        const resultDescription = `Assigned \`${role.name}\` to **${addedCount}** human members.\nFailed to assign to **${failedCount}** members.`;
        await message.reply({ embeds: [successEmbed('Roleall completed!', resultDescription)] }).catch(console.error);

        // Log to database
        const modLog = new ModLog({
            guildId: message.guild.id,
            action: 'Role All',
            targetId: role.id, // Target is the role
            moderatorId: message.author.id,
            reason: `Assigned role to ${addedCount} members. Failed on ${failedCount}.`,
            timestamp: new Date()
        });
        await modLog.save();

        // Log to audit channel
        await logToAuditChannel(message.guild, 'Role All Applied',
            `Role \`${role.name}\` was assigned to ${addedCount} human members by ${message.author.tag}.`,
            message.author, null, '#2980b9'
        );
    },
};