// commands/config/setprefix.js
const { errorEmbed, successEmbed, helpEmbed } = require('../../utils/embeds');
const { isModerator, checkDiscordPermissions } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
    name: 'setprefix',
    aliases: ['prefix', 'changeprefix'],
    description: 'Sets the custom prefix for this server.',
    usage: '`!setprefix <new_prefix>`',
    category: 'Config',
    permissions: ['ManageGuild'], // Only users with Manage Server permission can change prefix

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
            return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
        }

        const newPrefix = args[0];
        if (newPrefix.length > 5) {
            return message.reply({ embeds: [errorEmbed('Prefix too long.', 'Please keep the prefix to 5 characters or less.')] }).catch(console.error);
        }

        try {
            guildConfig.prefix = newPrefix;
            await guildConfig.save();

            await message.reply({ embeds: [successEmbed(`Server prefix has been set to \`${newPrefix}\`.`)] }).catch(console.error);

        } catch (error) {
            console.error(`Error setting prefix for guild ${message.guild.id}:`, error);
            await message.reply({ embeds: [errorEmbed('Failed to set new prefix.', `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
        }
    },
};