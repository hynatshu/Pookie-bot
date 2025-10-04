// events/messageCreate.js
const { errorEmbed } = require('../utils/embeds');
const config = require('../config/config.json');
const GuildConfig = require('../models/GuildConfig');
const UserBlacklist = require('../models/UserBlacklist');
const AliasConfig = require('../models/AliasConfig'); // For custom aliases

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        let guildConfig = null;
        if (message.guild) {
            guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
            // If no config found, create a default one
            if (!guildConfig) {
                guildConfig = new GuildConfig({ guildId: message.guild.id });
                await guildConfig.save();
            }
        }

        const prefix = guildConfig?.prefix || config.DEFAULT_PREFIX;

        // Check for specific users allowed to use commands without prefix
        const allowedNoPrefixUsers = [config.BOT_OWNER_ID]; // Add other user IDs here
        const isNoPrefixUser = allowedNoPrefixUsers.includes(message.author.id);

        let args;
        let commandName;

        if (isNoPrefixUser && !message.content.startsWith(prefix)) {
            // If it's a no-prefix user, try to parse the command directly
            args = message.content.trim().split(/ +/);
            commandName = args.shift().toLowerCase();
        } else if (message.content.startsWith(prefix)) {
            args = message.content.slice(prefix.length).trim().split(/ +/);
            commandName = args.shift().toLowerCase();
        } else {
            return; // Not a command
        }

        // --- Command Blacklist (Channel Level) ---
        if (message.guild && guildConfig?.cmdBlacklistedChannels.includes(message.channel.id)) {
            return; // Commands are blacklisted in this channel
        }

        // --- User Blacklist Check ---
        const userBlacklisted = await UserBlacklist.findOne({ userId: message.author.id });
        if (userBlacklisted) {
            return message.reply({ embeds: [errorEmbed('You are blacklisted from using Pookie Bot.')] }).catch(console.error);
        }

        // --- Alias Resolution ---
        let resolvedCommandName = commandName;
        // Check global aliases first
        const globalAlias = client.aliases.get(commandName);
        if (globalAlias) {
            resolvedCommandName = globalAlias;
        } else if (message.guild) {
            // Check guild-specific aliases from DB
            const guildAliases = await AliasConfig.findOne({ guildId: message.guild.id });
            if (guildAliases && guildAliases.aliases.has(commandName)) {
                resolvedCommandName = guildAliases.aliases.get(commandName);
            }
        }

        const command = client.commands.get(resolvedCommandName) ||
            client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(resolvedCommandName));

        if (!command) return; // Command not found after alias resolution

        // --- Audit Logs Command Blacklist (Other bots) ---
        // This feature is very complex as you cannot directly delete messages from other bots via the API.
        // The most you can do is delete your own bot's messages or log.
        // "block the use of cmd in chat from other bots that can be no prefix or any bots delete them"
        // This is not directly possible with the Discord API. If another bot sends a command,
        // your bot cannot delete *their* message. You can only ignore it.
        // A potential (but hacky) workaround would be to detect specific patterns in *other bot's messages*
        // and then delete *your own bot's messages* that respond to them, or log it.
        // For security, it's safer to *ignore* other bot's command-like messages.
        // If you meant to block Pookie's commands from being *triggered by other bots*,
        // the `if (message.author.bot) return;` at the start already handles this.
        // If you want Pookie to delete messages containing certain command patterns, *if sent by non-bots*,
        // you'd need to add a regex check here and `message.delete()`.
        // I will assume you meant Pookie should not respond to other bots' commands.

        try {
            await command.execute(message, args, client, guildConfig);
        } catch (error) {
            console.error(error);
            let errorMessage = `There was an error trying to execute that command!`;
            let solution = `Please try again. If the issue persists, contact a bot administrator.`;

            // Specific error handling for missing permissions
            if (error.message.includes('Missing Permissions')) {
                errorMessage = `I am missing some permissions to perform that action.`;
                solution = `Please ensure I have all the necessary permissions (e.g., Kick Members, Ban Members, Manage Roles, Manage Channels).`;
            } else if (error.message.includes('DiscordAPIError[50013]')) { // Example: Missing Permissions
                errorMessage = `I don't have permission to do that in this server.`;
                solution = `Please grant me the necessary permissions (e.g., Kick Members, Ban Members, Manage Roles, Manage Channels).`;
            }

            await message.reply({ embeds: [errorEmbed(errorMessage, solution)] }).catch(console.error);
        }
    },
};