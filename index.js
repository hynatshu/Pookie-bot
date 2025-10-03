// index.js
require('dotenv').config(); // Load environment variables from .env file
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('./config/config.json');
const { connectDB } = require('./utils/db');
const { handleBotHacked } = require('./utils/security'); // For auto-leave protection

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Required to read message content for prefix commands
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildModeration, // For kick, ban, etc.
        GatewayIntentBits.GuildVoiceStates, // For in-vc role
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
});

client.commands = new Collection();
client.aliases = new Collection(); // To store command aliases
client.cooldowns = new Collection(); // For command cooldowns

// Load Commands
const loadCommands = (dir) => {
    const commandFiles = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of commandFiles) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(fullPath); // Recursively load commands from subdirectories
        } else if (file.isFile() && file.name.endsWith('.js')) {
            try {
                const command = require(fullPath);
                client.commands.set(command.name, command);
                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => client.aliases.set(alias, command.name));
                }
                console.log(`Loaded command: ${command.name}`);
            } catch (error) {
                console.error(`Error loading command ${file.name}:`, error);
            }
        }
    }
};
loadCommands(path.join(__dirname, 'commands'));

// Load Events
const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`Loaded event: ${event.name}`);
}

// Database Connection
connectDB();

// Global error handling for unhandled rejections (e.g., failed DB queries)
process.on('unhandledRejection', (error, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', error);
    // Optionally, send a DM to the bot owner or log to a specific channel
    // client.users.cache.get(config.BOT_OWNER_ID).send(`Unhandled Rejection: \`\`\`${error.stack}\`\`\``).catch(console.error);
});

// Auto-leave protection - simplified for demonstration, needs robust implementation
// This is a basic example; a real hack detection would be more complex.
// For example, if critical files are modified, or an unauthorized command is run.
if (process.env.NODE_ENV === 'production' && !process.env.DISCORD_BOT_TOKEN) {
    // If token is missing in production, assume compromise
    console.error("Bot token is missing in production environment. Initiating auto-leave protocol.");
    // This part requires access to Guilds before login, which is tricky.
    // A better approach is to check this in the 'ready' event or during command execution.
    // For now, this is a placeholder.
    // A more robust solution involves a security module that constantly monitors for suspicious activity.
}


client.login(process.env.DISCORD_BOT_TOKEN).catch(async (err) => {
    console.error("Failed to login to Discord:", err);
    // This indicates a token issue, not necessarily a hack.
    // However, if a token *was* compromised and *then* changed, this could trigger.
    if (err.message === 'An invalid token was provided.') {
        console.error("Invalid token provided. Attempting auto-leave (if already in guilds) and warning.");
        // This is tricky: if login fails, we can't use client.guilds.cache
        // A more advanced system would store guild IDs in DB and try to leave via webhook/API if possible.
        // For now, if the bot can't even log in, it can't "leave" actively.
        // It's more about preventing further damage once *logged in* and compromised.
    }
});