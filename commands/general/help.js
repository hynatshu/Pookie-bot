// commands/general/help.js
// Complete help command for Pookie
// - Prefix-based by default (client handler should call command with (client, message, args))
// - Also designed so a slash /help command can call the same function by passing an interaction
// - Shows command list, command detail, aliases, cooldown, required perms, and example usage
// - All responses are embeds and include error/help guidance when needed

const { EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Show list of bot commands or details for a specific command.',
    // example aliases; you can add more aliases in the array
    aliases: ['h', 'commands', 'cmds', 'info', 'helpme', 'Help'],
    usage: '[command]',
    category: 'General',
    // cooldown in seconds
    cooldown: 3,

    /**
     * Run function for message-based invocation.
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').Message} message
     * @param {string[]} args
     */
    async run(client, message, args) {
        try {
            const prefix = await getPrefix(client, message.guild?.id);

            // If user asked for a specific command
            if (args && args.length > 0) {
                const search = args.join(' ').toLowerCase();
                const cmd =
                    client.commands.get(search) ||
                    client.commands.find(c => (c.aliases || []).map(a => a.toLowerCase()).includes(search));

                if (!cmd) {
                    return sendErrorEmbed(message.channel, `Command not found: \`${search}\``, `Try: \`${prefix}help\` to view all commands.`);
                }

                const embed = new EmbedBuilder()
                    .setTitle(`Help — ${cmd.name}`)
                    .setDescription(cmd.description || 'No description available.')
                    .addFields(
                        { name: 'Usage', value: `\`${prefix}${cmd.name} ${cmd.usage || ''}\``, inline: false },
                        { name: 'Category', value: `${cmd.category || 'General'}`, inline: true },
                        { name: 'Aliases', value: `${(cmd.aliases && cmd.aliases.length) ? cmd.aliases.join(', ') : 'None'}`, inline: true },
                        { name: 'Cooldown', value: `${cmd.cooldown ? `${cmd.cooldown}s` : 'None'}`, inline: true },
                    )
                    .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();

                // If command defines permission requirements, show them
                if (cmd.permissions || cmd.userPermissions) {
                    const userPerms = (cmd.userPermissions || cmd.permissions || []).map(p => formatPermission(p)).join(', ');
                    if (userPerms.length) embed.addFields({ name: 'Required Permissions', value: userPerms, inline: false });
                }

                return message.channel.send({ embeds: [embed] });
            }

            // Otherwise show summary of commands grouped by category
            const categories = new Map();
            for (const [, command] of client.commands) {
                const cat = command.category || 'General';
                if (!categories.has(cat)) categories.set(cat, []);
                categories.get(cat).push(command);
            }

            const embed = new EmbedBuilder()
                .setTitle('Pookie — Commands')
                .setDescription(`Prefix for this server: \`${prefix}\`\nType \`${prefix}help <command>\` for detailed info on a command.`)
                .setTimestamp()
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

            // Add categories, but avoid embed having too many fields. We'll add up to X categories in the embed fields,
            // other categories appended in a short list in the description.
            const MAX_FIELDS = 6;
            let fieldCount = 0;
            for (const [cat, cmds] of categories) {
                const visible = cmds
                    .map(c => `\`${c.name}${(c.usage ? ` ${c.usage}` : '')}\``)
                    .slice(0, 12) // prevent huge lists
                    .join(' • ');
                if (fieldCount < MAX_FIELDS) {
                    embed.addFields({ name: `${cat} [${cmds.length}]`, value: visible || 'No commands', inline: false });
                    fieldCount++;
                } else {
                    // append to description if we hit field limit
                    embed.setDescription((embed.data.description || '') + `\n**${cat}** — ${cmds.length} commands`);
                }
            }

            // Add quick helpful extras
            embed.addFields(
                { name: 'Quick features', value: 'Moderation, auto-role, blacklist, audits, security protections, ping, stats, dm, reminders (timeout/mute).', inline: false },
                { name: 'Slash /help', value: 'If your server has the slash command registered, use `/help` to open this menu as a slash interaction.', inline: false }
            );

            return message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error('help command error:', err);
            return sendErrorEmbed(message.channel, 'Something went wrong while running help.', 'Make sure the bot has permission to send embeds. Contact the bot owner if the error persists.');
        }
    },

    /**
     * Optional: export data for creating a slash command with similar behavior
     * Your slash registration flow can import this to register a /help global or guild command.
     */
    slash: {
        data: {
            name: 'help',
            description: 'Show list of bot commands or details for a specific command',
            options: [
                {
                    name: 'command',
                    description: 'Command to get detailed info for',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },
            ],
        },

        /**
         * Handler for an Interaction (slash) version. This function expects the bot's generic interaction handler to call it.
         * @param {import('discord.js').Client} client
         * @param {import('discord.js').CommandInteraction} interaction
         */
        async execute(client, interaction) {
            try {
                const prefix = await getPrefix(client, interaction.guildId);

                const cmdName = interaction.options.getString('command');
                if (cmdName) {
                    const search = cmdName.toLowerCase();
                    const cmd = client.commands.get(search) ||
                        client.commands.find(c => (c.aliases || []).map(a => a.toLowerCase()).includes(search));

                    if (!cmd) {
                        return interaction.reply({ embeds: [makeErrorEmbed(`Command not found: \`${cmdName}\``, `Try \`${prefix}help\` to view all commands.`)], ephemeral: true });
                    }

                    const embed = new EmbedBuilder()
                        .setTitle(`Help — ${cmd.name}`)
                        .setDescription(cmd.description || 'No description available.')
                        .addFields(
                            { name: 'Usage', value: `\`${prefix}${cmd.name} ${cmd.usage || ''}\``, inline: false },
                            { name: 'Category', value: `${cmd.category || 'General'}`, inline: true },
                            { name: 'Aliases', value: `${(cmd.aliases && cmd.aliases.length) ? cmd.aliases.join(', ') : 'None'}`, inline: true },
                            { name: 'Cooldown', value: `${cmd.cooldown ? `${cmd.cooldown}s` : 'None'}`, inline: true },
                        )
                        .setTimestamp()
                        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                    if (cmd.permissions || cmd.userPermissions) {
                        const userPerms = (cmd.userPermissions || cmd.permissions || []).map(p => formatPermission(p)).join(', ');
                        if (userPerms.length) embed.addFields({ name: 'Required Permissions', value: userPerms, inline: false });
                    }

                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // Show general list
                const categories = new Map();
                for (const [, command] of client.commands) {
                    const cat = command.category || 'General';
                    if (!categories.has(cat)) categories.set(cat, []);
                    categories.get(cat).push(command);
                }

                const embed = new EmbedBuilder()
                    .setTitle('Pookie — Commands')
                    .setDescription(`Prefix for this server: \`${prefix}\`\nType \`${prefix}help <command>\` for detailed info on a command.`)
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                let fieldCount = 0;
                const MAX_FIELDS = 6;
                for (const [cat, cmds] of categories) {
                    const visible = cmds
                        .map(c => `\`${c.name}${(c.usage ? ` ${c.usage}` : '')}\``)
                        .slice(0, 12)
                        .join(' • ');
                    if (fieldCount < MAX_FIELDS) {
                        embed.addFields({ name: `${cat} [${cmds.length}]`, value: visible || 'No commands', inline: false });
                        fieldCount++;
                    } else {
                        embed.setDescription((embed.data.description || '') + `\n**${cat}** — ${cmds.length} commands`);
                    }
                }

                embed.addFields(
                    { name: 'Quick features', value: 'Moderation, auto-role aliases, audit logs, blacklist, security & webhook protection, ping, stats, dm & reminders.', inline: false },
                    { name: 'Note', value: 'All bot replies are embeds. If you see plain messages, check bot permissions.', inline: false }
                );

                return interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (err) {
                console.error('slash help error:', err);
                return interaction.reply({ embeds: [makeErrorEmbed('Failed to run /help', 'Contact the bot owner')], ephemeral: true });
            }
        }
    }
};

/* ----------------- Helper functions ----------------- */

/**
 * Try to get the prefix for the guild from DB (if available) or fallback to default.
 * This function gracefully handles missing DB or models.
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 */
async function getPrefix(client, guildId) {
    // Fallback default; change to your default if different
    const DEFAULT_PREFIX = process.env.PREFIX || 'p!';
    if (!guildId) return DEFAULT_PREFIX;

    try {
        // If your project uses mongoose and has a GuildConfig model, try to use it.
        // Many projects attach models under client.db or require them directly.
        // We do this safely: if anything throws, we catch and return default.
        const GuildModel = client.models?.Guild || client.guildConfigModel || null;
        if (GuildModel && typeof GuildModel.findOne === 'function') {
            const doc = await GuildModel.findOne({ guildId }).lean().exec();
            if (doc && doc.prefix) return doc.prefix;
        }
    } catch (err) {
        // ignore and use default
        console.debug('getPrefix DB lookup failed:', err?.message || err);
    }
    return DEFAULT_PREFIX;
}

/**
 * Format permission constants into human readable strings.
 */
function formatPermission(perm) {
    // If given as PermissionsBitField flag, try to map to a readable string; otherwise return original.
    if (!perm) return String(perm || 'Unknown');
    if (typeof perm === 'string') return perm.split(/(?=[A-Z])/).join(' ').replace(/Guild /gi, '').trim();
    try {
        return PermissionsBitField.Flags[perm] ? perm.replace(/([A-Z])/g, ' $1').trim() : String(perm);
    } catch {
        return String(perm);
    }
}

/**
 * Send a standardized error embed to a text channel (MessageChannel).
 * @param {import('discord.js').TextChannel | import('discord.js').DMChannel | import('discord.js').NewsChannel} channel
 * @param {string} title
 * @param {string} guidance
 */
function sendErrorEmbed(channel, title, guidance) {
    const embed = makeErrorEmbed(title, guidance);
    return channel.send({ embeds: [embed] });
}

function makeErrorEmbed(title, guidance) {
    return new EmbedBuilder()
        .setTitle('❌ ' + title)
        .setDescription(guidance || '')
        .setTimestamp();
}
