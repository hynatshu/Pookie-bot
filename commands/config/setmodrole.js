// commands/config/setmodrole.js
const { errorEmbed, successEmbed, helpEmbed, warningEmbed } = require('../../utils/embeds');
const { isModerator, checkDiscordPermissions } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
    name: 'setmodrole',
    aliases: ['addmodrole', 'removemodrole', 'modroles'],
    description: 'Manages roles that are allowed to use moderation commands. Only for users with "Manage Guild" permission.',
    usage: '`!setmodrole add <@role|roleID|roleName>`\n`!setmodrole remove <@role|roleID|roleName>`\n`!setmodrole list`',
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
            const currentModRoles = guildConfig.modRoles.length > 0
                ? guildConfig.modRoles.map(id => message.guild.roles.cache.get(id)?.name || `\`Unknown Role (ID: ${id})\``).join(', ')
                : 'None';
            return message.reply({
                embeds: [helpEmbed(
                    this.name, this.usage, this.description, this.aliases
                ).addFields({ name: 'Current Moderator Roles', value: currentModRoles })]
            }).catch(console.error);
        }

        const subcommand = args[0].toLowerCase();

        if (subcommand === 'add') {
            if (args.length < 2) {
                return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
            }

            const roleIdentifier = args.slice(1).join(' ');
            const role = message.mentions.roles.first() ||
                message.guild.roles.cache.get(roleIdentifier) ||
                message.guild.roles.cache.find(r => r.name.toLowerCase() === roleIdentifier.toLowerCase());

            if (!role) {
                return message.reply({ embeds: [errorEmbed('Could not find that role.', 'Please mention a role, provide a valid role ID, or the exact role name.')] }).catch(console.error);
            }

            if (guildConfig.modRoles.includes(role.id)) {
                return message.reply({ embeds: [warningEmbed(`\`${role.name}\` is already a moderator role.`)] }).catch(console.error);
            }

            guildConfig.modRoles.push(role.id);
            await guildConfig.save();

            await message.reply({ embeds: [successEmbed(`\`${role.name}\` has been added as a moderator role.`)] }).catch(console.error);

        } else if (subcommand === 'remove') {
            if (args.length < 2) {
                return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
            }

            const roleIdentifier = args.slice(1).join(' ');
            const role = message.mentions.roles.first() ||
                message.guild.roles.cache.get(roleIdentifier) ||
                message.guild.roles.cache.find(r => r.name.toLowerCase() === roleIdentifier.toLowerCase());

            if (!role) {
                return message.reply({ embeds: [errorEmbed('Could not find that role.', 'Please mention a role, provide a valid role ID, or the exact role name.')] }).catch(console.error);
            }

            if (!guildConfig.modRoles.includes(role.id)) {
                return message.reply({ embeds: [warningEmbed(`\`${role.name}\` is not currently a moderator role.`)] }).catch(console.error);
            }

            guildConfig.modRoles = guildConfig.modRoles.filter(rId => rId !== role.id);
            await guildConfig.save();

            await message.reply({ embeds: [successEmbed(`\`${role.name}\` has been removed from moderator roles.`)] }).catch(console.error);

        } else if (subcommand === 'list') {
            const modRolesList = guildConfig.modRoles.length > 0
                ? guildConfig.modRoles.map(id => {
                    const r = message.guild.roles.cache.get(id);
                    return r ? `\`${r.name}\` (ID: ${r.id})` : `\`Unknown Role\` (ID: ${id})`;
                }).join('\n')
                : 'No moderator roles configured. Server owners and users with "Manage Guild" will still be able to use mod commands.';

            const embed = successEmbed(
                'Configured Moderator Roles',
                modRolesList
            );
            await message.channel.send({ embeds: [embed] }).catch(console.error);

        } else {
            return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
        }
    },
};