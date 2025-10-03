// commands/general/stats.js
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const os = require('os');
const ms = require('ms');

module.exports = {
    name: 'stats',
    aliases: ['info', 'botinfo'],
    description: 'Displays Pookie Bot\'s statistics and system information.',
    usage: '`!stats`',
    category: 'General',
    permissions: [],

    async execute(message, args, client, guildConfig) {
        try {
            const uptime = ms(client.uptime, { long: true });
            const guildCount = client.guilds.cache.size;
            const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            const channelCount = client.channels.cache.size;

            const cpuUsage = (process.cpuUsage().user / 1024 / 1024).toFixed(2); // In MB, rough
            const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2); // In MB
            const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2); // In GB
            const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2); // In GB
            const osUptime = ms(os.uptime() * 1000, { long: true });

            const embed = createEmbed(
                'Pookie Bot Statistics',
                'Here\'s some information about me!',
                '#3498db',
                [
                    { name: '📊 General Stats', value: ``, inline: false },
                    { name: 'Servers', value: `${guildCount}`, inline: true },
                    { name: 'Users', value: `${userCount}`, inline: true },
                    { name: 'Channels', value: `${channelCount}`, inline: true },
                    { name: 'Bot Uptime', value: `${uptime}`, inline: true },
                    { name: 'Discord.js Version', value: `v${require('discord.js').version}`, inline: true },
                    { name: 'Node.js Version', value: `${process.version}`, inline: true },
                    { name: '💻 System Stats', value: ``, inline: false },
                    { name: 'Platform', value: `${os.platform()}`, inline: true },
                    { name: 'OS Uptime', value: `${osUptime}`, inline: true },
                    { name: 'CPU Usage (Bot)', value: `${cpuUsage} MB`, inline: true },
                    { name: 'Memory Usage (Bot)', value: `${memoryUsage} MB`, inline: true },
                    { name: 'Total System Memory', value: `${totalMemory} GB`, inline: true },
                    { name: 'Free System Memory', value: `${freeMemory} GB`, inline: true },
                ]
            );

            await message.channel.send({ embeds: [embed] }).catch(console.error);

        } catch (error) {
            console.error('Error in stats command:', error);
            await message.reply({ embeds: [errorEmbed('Failed to retrieve bot statistics.', `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
        }
    },
};