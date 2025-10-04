// events/ready.js
const { ActivityType } = require('discord.js');
const config = require('../config/config.json');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Pookie is online! Logged in as ${client.user.tag}`);
        client.user.setActivity(`for commands | ${config.DEFAULT_PREFIX}help`, { type: ActivityType.Watching });
    },
};