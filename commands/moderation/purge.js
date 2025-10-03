// commands/moderation/purge.js
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'purge',
    aliases: ['clear'],
    description: 'Bulk delete messages: purge 50',
    allowedRoles: [],
    async execute({ message, args }) {
        const amount = Math.min(parseInt(args[0]) || 0, 100);
        if (!amount || amount < 1) return message.reply({ embeds: [require('../../utils/embeds').errorEmbed('Usage', 'purge <1-100>')] });
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && String(message.author.id) !== process.env.OWNER_ID) {
            return message.reply({ embeds: [require('../../utils/embeds').errorEmbed('Permission denied', 'You need Manage Messages permission.')] });
        }
        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply({ embeds: [require('../../utils/embeds').errorEmbed('Missing permission', 'Bot needs Manage Messages permission.')] });
        }
        try {
            const deleted = await message.channel.bulkDelete(amount, true);
            message.channel.send({ embeds: [new EmbedBuilder().setTitle('Purge complete').setDescription(`Deleted ${deleted.size} messages.`)] }).then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
        } catch (err) {
            console.error('purge error', err);
            message.reply({ embeds: [require('../../utils/embeds').errorEmbed('Failed', 'Could not purge messages.')] });
        }
    }
};
