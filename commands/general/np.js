// commands/misc/np.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'np',
    aliases: ['nowplaying'],
    description: 'Owner-only: set a status or announcement for a user. Usage: np <user> <timeInSeconds> <message>',
    ownerOnly: true,
    async execute({ client, message, args }) {
        const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        if (!user) return message.reply({ embeds: [require('../../utils/embeds').errorEmbed('Usage', 'np @user <timeSec> <text>')] });
        const timeSec = parseInt(args[1]) || 60;
        const text = args.slice(2).join(' ') || 'Now active';
        try {
            // Example behavior: DM the user the NP text for specified time (simple demonstration)
            await user.send({ embeds: [new EmbedBuilder().setTitle('Now Playing').setDescription(text).addFields({ name: 'Expires (s)', value: `${timeSec}` })] }).catch(() => { });
            message.channel.send({ embeds: [new EmbedBuilder().setTitle('NP set').setDescription(`Sent NP to ${user.tag} for ${timeSec}s`)] });
            // You can extend to store in DB and show in public channels as needed
        } catch (err) {
            console.error('np error', err);
            message.reply({ embeds: [require('../../utils/embeds').errorEmbed('Failed', 'Could not set NP.')] });
        }
    }
};
