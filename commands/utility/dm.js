// commands/utility/blacklist.js
const Blacklist = require('../../models/UserBlacklist');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'blacklist',
    description: 'Manage bot blacklist. usage: blacklist add @user reason | blacklist remove @user | blacklist list',
    allowedRoles: [],
    async execute({ message, args }) {
        const action = args[0];
        if (!action) return message.reply({ embeds: [require('../../utils/embeds').errorEmbed('Usage', 'blacklist add|remove|list <@user>')] });
        if (action === 'add') {
            const user = message.mentions.users.first() || message.guild.members.cache.get(args[1])?.user;
            if (!user) return message.reply({ embeds: [require('../../utils/embeds').errorEmbed('Usage', 'blacklist add @user <reason>')] });
            if (String(user.id) === String(process.env.OWNER_ID)) return message.reply({ embeds: [require('../../utils/embeds').errorEmbed('Denied', 'You cannot blacklist the bot owner.')] });
            const reason = args.slice(2).join(' ') || 'No reason';
            await Blacklist.create({ userId: user.id, addedBy: message.author.id, reason }).catch(() => { });
            return message.channel.send({ embeds: [new EmbedBuilder().setTitle('Blacklisted').setDescription(`${user.tag} has been blacklisted.`)] });
        } else if (action === 'remove') {
            const user = message.mentions.users.first() || message.guild.members.cache.get(args[1])?.user;
            if (!user) return message.reply({ embeds: [require('../../utils/embeds').errorEmbed('Usage', 'blacklist remove @user')] });
            await Blacklist.deleteOne({ userId: user.id });
            return message.channel.send({ embeds: [new EmbedBuilder().setTitle('Removed').setDescription(`${user.tag} removed from blacklist.`)] });
        } else if (action === 'list') {
            const list = await Blacklist.find().limit(100);
            const lines = list.length ? list.map(l => `${l.userId} — ${l.reason}`) : ['No entries'];
            return message.channel.send({ embeds: [new EmbedBuilder().setTitle('Blacklist').setDescription(lines.join('\n').slice(0, 2048))] });
        } else {
            return message.reply({ embeds: [require('../../utils/embeds').errorEmbed('Usage', 'blacklist add|remove|list')] });
        }
    }
};
