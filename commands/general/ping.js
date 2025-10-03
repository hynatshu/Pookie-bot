// commands/general/ping.js
const { createEmbed, successEmbed } = require('../../utils/embeds');
const mongoose = require('mongoose'); // For DB ping

module.exports = {
    name: 'ping',
    aliases: ['latency'],
    description: 'Shows Pookie Bot\'s API latency and database ping.',
    usage: '`!ping`',
    category: 'General',
    permissions: [],

    async execute(message, args, client, guildConfig) {
        try {
            const m = await message.reply({ embeds: [createEmbed('Pinging...', 'Measuring latency...')], fetchReply: true });

            const apiLatency = Math.round(client.ws.ping);
            const botLatency = m.createdTimestamp - message.createdTimestamp;

            let dbLatency = 'N/A';
            if (mongoose.connection.readyState === 1) { // 1 means connected
                const startDb = Date.now();
                await mongoose.connection.db.admin().ping();
                dbLatency = Date.now() - startDb;
            }

            const embed = createEmbed(
                'Pong! 🏓',
                '',
                '#3498db',
                [
                    { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
                    { name: 'Bot Latency', value: `${botLatency}ms`, inline: true },
                    { name: 'Database Latency', value: `${dbLatency}ms`, inline: true }
                ]
            );

            await m.edit({ embeds: [embed] }).catch(console.error);

        } catch (error) {
            console.error('Error in ping command:', error);
            await message.reply({ embeds: [errorEmbed('Failed to get ping details.', `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
        }
    },
};