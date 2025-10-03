// events/guildCreate.js
const GuildConfig = require('../models/GuildConfig');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildCreate',
    async execute(client, guild) {
        // create a default config entry
        try {
            await GuildConfig.findOneAndUpdate(
                { guildId: guild.id },
                { guildId: guild.id },
                { upsert: true }
            );
            // DM guild owner a welcome message (best-effort)
            try {
                const owner = await guild.fetchOwner();
                owner.send({
                    embeds: [new EmbedBuilder().setTitle('Thanks for adding Pookie').setDescription('Use `!help` to see commands. Configure me with `!setconfig`.')]
                }).catch(() => { });
            } catch { }
        } catch (err) {
            console.error('guildCreate error', err);
        }
    }
};
