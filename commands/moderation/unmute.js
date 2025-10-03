const Mute = require('../../models/mute');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'unmute',
    description: 'Remove timeout from a member',
    async execute({ client, message, args }) {
        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!target) return message.reply({ embeds: [new EmbedBuilder().setTitle('Usage').setDescription('`unmute @user`')] });
        await target.timeout(null).catch(() => { });
        await Mute.deleteMany({ guildId: message.guild.id, userId: target.id });
        message.channel.send({ embeds: [new EmbedBuilder().setTitle('Unmuted').setDescription(`<@${target.id}> can speak again.`)] });
    }
};
