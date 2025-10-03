// commands/general/help.js
const { SlashCommandBuilder } = require('discord.js'); // Only for the single slash command
const { createEmbed, helpEmbed } = require('../../utils/embeds');
const config = require('../../config/config.json');

module.exports = {
    name: 'help',
    aliases: ['h', 'commands'],
    description: 'Displays all available commands or detailed info for a specific command.',
    usage: '`!help [command_name]`',
    category: 'General',
    // Define the slash command for help
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands or detailed info for a specific command.')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The name of the command to get help for.')
                .setRequired(false)),

    async execute(message, args, client, guildConfig) {
        const prefix = guildConfig?.prefix || config.DEFAULT_PREFIX;

        if (!args.length) {
            const categories = {};
            client.commands.forEach(command => {
                if (command.category) {
                    if (!categories[command.category]) {
                        categories[command.category] = [];
                    }
                    categories[command.category].push(command.name);
                }
            });

            const fields = Object.keys(categories).sort().map(category => ({
                name: `**${category}**`,
                value: categories[category].map(cmd => `\`${cmd}\``).join(', '),
                inline: false
            }));

            const embed = createEmbed(
                'Pookie Bot Commands',
                `Use \`${prefix}help <command_name>\` for more info on a command.`,
                '#3498db',
                fields
            );
            await message.channel.send({ embeds: [embed] }).catch(console.error);
        } else {
            const commandName = args[0].toLowerCase();
            const command = client.commands.get(commandName) ||
                client.commands.find(cmd => cmd.aliases && cmd.