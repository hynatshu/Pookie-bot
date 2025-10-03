// commands/config/setautorolealias.js
const { errorEmbed, successEmbed, helpEmbed, warningEmbed, createEmbed } = require('../../utils/embeds');
const { isModerator, checkDiscordPermissions } = require('../../utils/permissions');
const AliasConfig = require('../../models/AliasConfig'); // This uses the AliasConfig model

module.exports = {
    name: 'setautorolealias',
    aliases: ['rolealias', 'aralias'],
    description: 'Manages aliases for auto-role assignments. Create custom commands to give specific roles.',
    usage: '`!setautorolealias add <alias_name> <@role|roleID|roleName>`\n`!setautorolealias remove <alias_name>`\n`!setautorolealias list`',
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
            return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
        }

        const subcommand = args[0].toLowerCase();
        let aliasConfig = await AliasConfig.findOne({ guildId: message.guild.id });
        if (!aliasConfig) {
            aliasConfig = new AliasConfig({ guildId: message.guild.id });
        }

        if (subcommand === 'add') {
            if (args.length < 3) {
                return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
            }

            const aliasName = args[1].toLowerCase();
            const roleIdentifier = args.slice(2).join(' ');
            const role = message.mentions.roles.first() ||
                message.guild.roles.cache.get(roleIdentifier) ||
                message.guild.roles.cache.find(r => r.name.toLowerCase() === roleIdentifier.toLowerCase());

            if (!role) {
                return message.reply({ embeds: [errorEmbed('Could not find that role.', 'Please mention a role, provide a valid role ID, or the exact role name.')] }).catch(console.error);
            }

            // Check if aliasName conflicts with an existing command or global alias
            if (client.commands.has(aliasName) || client.aliases.has(aliasName)) {
                return message.reply({ embeds: [warningEmbed(`\`${aliasName}\` is already a command or global alias. Please choose a different alias name.`)] }).catch(console.error);
            }

            // Check role hierarchy - bot must be able to assign this role
            if (role.position >= message.guild.members.me.roles.highest.position) {
                return message.reply({ embeds: [errorEmbed(`I cannot assign the role \`${role.name}\` because it is equal to or higher than my highest role.`, "Please ensure Pookie Bot's highest role is above the role you are trying to alias.")] }).catch(console.error);
            }

            aliasConfig.autoRoleAliases.set(aliasName, role.id);
            await aliasConfig.save();

            await message.reply({ embeds: [successEmbed(`Auto-role alias \`${aliasName}\` has been set for role \`${role.name}\`.`, `Now, \`${guildConfig?.prefix || '!'}${aliasName} <@user|userID>\` will assign this role.`)] }).catch(console.error);

        } else if (subcommand === 'remove') {
            if (args.length < 2) {
                return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
            }

            const aliasName = args[1].toLowerCase();
            if (!aliasConfig.autoRoleAliases.has(aliasName)) {
                return message.reply({ embeds: [warningEmbed(`No auto-role alias found for \`${aliasName}\`.`)] }).catch(console.error);
            }

            aliasConfig.autoRoleAliases.delete(aliasName);
            await aliasConfig.save();

            await message.reply({ embeds: [successEmbed(`Auto-role alias \`${aliasName}\` has been removed.`)] }).catch(console.error);

        } else if (subcommand === 'list') {
            const aliasEntries = Array.from(aliasConfig.autoRoleAliases.entries());
            if (aliasEntries.length === 0) {
                return message.reply({ embeds: [successEmbed('No auto-role aliases configured for this server.')] }).catch(console.error);
            }

            const fields = await Promise.all(aliasEntries.map(async ([alias, roleId]) => {
                const role = message.guild.roles.cache.get(roleId);
                const roleName = role ? `\`${role.name}\` (ID: ${roleId})` : `\`Unknown Role\` (ID: ${roleId})`;
                return { name: `Alias: \`${alias}\``, value: `Role: ${roleName}`, inline: false };
            }));

            const embed = createEmbed(
                'Configured Auto-Role Aliases',
                'These aliases can be used to quickly assign roles:',
                '#3498db',
                fields
            );
            await message.channel.send({ embeds: [embed] }).catch(console.error);

        } else {
            return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
        }
    },
};