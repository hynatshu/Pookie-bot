// commands/config/setautorole.js
const { errorEmbed, successEmbed, helpEmbed, warningEmbed } = require('../../utils/embeds');
const { isModerator, checkDiscordPermissions } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
    name: 'setautorole',
    aliases: ['autorole', 'joinrole'],
    description: 'Configures the auto-role for new members.',
    usage: '`!setautorole <@role|roleID|roleName|disable>`',
    category: 'Config',
    permissions: ['ManageRoles', 'ManageGuild'],

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
        const botMissingPerms = checkDiscordPermissions(message.guild.members.me, ['ManageRoles']); // Bot needs ManageRoles
        if (botMissingPerms.length > 0) {
            return message.reply({
                embeds: [errorEmbed(
                    `Pookie is missing the "Manage Roles" permission to perform this action.`,
                    `Please grant Pookie this permission.`
                )]
            }).catch(console.error);
        }

        if (!await isModerator(message, this.permissions)) {
            return message.reply({ embeds: [errorEmbed('You do not have permission to use this command.')] }).catch(console.error);
        }

        if (args.length < 1) {
            const currentAutoRole = guildConfig.autoRole.enabled && guildConfig.autoRole.roleId
                ? message.guild.roles.cache.get(guildConfig.autoRole.roleId)?.name || `\`Unknown Role (ID: ${guildConfig.autoRole.roleId})\``
                : 'None';
            return message.reply({
                embeds: [helpEmbed(
                    this.name, this.usage, this.description, this.aliases
                ).addFields({ name: 'Current Auto-Role', value: currentAutoRole })]
            }).catch(console.error);
        }

        const input = args.join(' ').toLowerCase();

        if (input === 'disable') {
            guildConfig.autoRole.enabled = false;
            guildConfig.autoRole.roleId = null;
            await guildConfig.save();
            return message.reply({ embeds: [successEmbed('Auto-role has been disabled.')] }).catch(console.error);
        }

        const role = message.mentions.roles.first() ||
            message.guild.roles.cache.get(input) ||
            message.guild.roles.cache.find(r => r.name.toLowerCase() === input);

        if (!role) {
            return message.reply({ embeds: [errorEmbed('Could not find that role.', 'Please mention a role, provide a valid role ID, or the exact role name.')] }).catch(console.error);
        }

        // Check role hierarchy - bot must be able to assign this role
        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ embeds: [errorEmbed(`I cannot assign the role \`${role.name}\` because it is equal to or higher than my highest role.`, "Please ensure Pookie Bot's highest role is above the role you are trying to set as auto-role.")] }).catch(console.error);
        }

        guildConfig.autoRole.enabled = true;
        guildConfig.autoRole.roleId = role.id;
        await guildConfig.save();

        await message.reply({ embeds: [successEmbed(`Auto-role has been set to \`${role.name}\`. New members will now receive this role.`)] }).catch(console.error);
    },
};