// commands/general/blacklist.js
const { errorEmbed, successEmbed, helpEmbed, warningEmbed, createEmbed } = require('../../utils/embeds');
const { isModerator } = require('../../utils/permissions'); // This command is bot-owner only, so isModerator is less relevant here.
const UserBlacklist = require('../../models/UserBlacklist');
const config = require('../../config/config.json');

module.exports = {
    name: 'blacklist',
    aliases: ['bl'],
    description: 'Manages the bot\'s user blacklist. Only for bot owner.',
    usage: '`!blacklist add <@user|userID> [reason]`\n`!blacklist remove <@user|userID>`\n`!blacklist list`',
    category: 'General',
    permissions: [], // No specific Discord permissions, but bot-owner only

    async execute(message, args, client, guildConfig) {
        // --- Bot Owner Only Check ---
        if (message.author.id !== config.BOT_OWNER_ID) {
            return message.reply({ embeds: [errorEmbed('This command can only be used by the bot owner.')] }).catch(console.error);
        }

        if (args.length < 1) {
            return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
        }

        const subcommand = args[0].toLowerCase();

        if (subcommand === 'add') {
            if (args.length < 2) {
                return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
            }

            const targetId = message.mentions.users.first()?.id || args[1];
            const targetUser = await client.users.fetch(targetId).catch(() => null);

            if (!targetUser) {
                return message.reply({ embeds: [errorEmbed('Could not find that user.', 'Please mention a user or provide a valid user ID.')] }).catch(console.error);
            }

            if (targetUser.id === config.BOT_OWNER_ID) {
                return message.reply({ embeds: [warningEmbed('You cannot blacklist the bot owner.')] }).catch(console.error);
            }
            if (targetUser.id === client.user.id) {
                return message.reply({ embeds: [warningEmbed('You cannot blacklist Pookie Bot.')] }).catch(console.error);
            }

            const reason = args.slice(2).join(' ') || 'No reason provided.';

            try {
                const existingBlacklist = await UserBlacklist.findOne({ userId: targetUser.id });
                if (existingBlacklist) {
                    return message.reply({ embeds: [warningEmbed(`${targetUser.tag} is already blacklisted.`)] }).catch(console.error);
                }

                const newBlacklistEntry = new UserBlacklist({
                    userId: targetUser.id,
                    reason: reason,
                    blacklistedBy: message.author.id,
                    timestamp: new Date()
                });
                await newBlacklistEntry.save();

                await message.reply({ embeds: [successEmbed(`${targetUser.tag} has been added to the blacklist.`, `Reason: ${reason}`)] }).catch(console.error);

            } catch (error) {
                console.error(`Error adding ${targetUser.tag} to blacklist:`, error);
                await message.reply({ embeds: [errorEmbed(`Failed to blacklist ${targetUser.tag}.`, `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
            }

        } else if (subcommand === 'remove') {
            if (args.length < 2) {
                return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
            }

            const targetId = message.mentions.users.first()?.id || args[1];
            const targetUser = await client.users.fetch(targetId).catch(() => null);

            if (!targetUser) {
                return message.reply({ embeds: [errorEmbed('Could not find that user.', 'Please mention a user or provide a valid user ID.')] }).catch(console.error);
            }

            try {
                const result = await UserBlacklist.deleteOne({ userId: targetUser.id });

                if (result.deletedCount === 0) {
                    return message.reply({ embeds: [warningEmbed(`${targetUser.tag} is not currently blacklisted.`)] }).catch(console.error);
                }

                await message.reply({ embeds: [successEmbed(`${targetUser.tag} has been removed from the blacklist.`)] }).catch(console.error);

            } catch (error) {
                console.error(`Error removing ${targetUser.tag} from blacklist:`, error);
                await message.reply({ embeds: [errorEmbed(`Failed to remove ${targetUser.tag} from blacklist.`, `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
            }

        } else if (subcommand === 'list') {
            try {
                const blacklistedUsers = await UserBlacklist.find({});
                if (blacklistedUsers.length === 0) {
                    return message.reply({ embeds: [successEmbed('The blacklist is currently empty.')] }).catch(console.error);
                }

                const userList = await Promise.all(blacklistedUsers.map(async (entry) => {
                    const user = await client.users.fetch(entry.userId).catch(() => ({ tag: 'Unknown User', id: entry.userId }));
                    const blacklister = await client.users.fetch(entry.blacklistedBy).catch(() => ({ tag: 'Unknown', id: entry.blacklistedBy }));
                    return `**${user.tag}** (\`${user.id}\`)\n  - Reason: ${entry.reason}\n  - Blacklisted By: ${blacklister.tag}`;
                }));

                const embed = createEmbed(
                    'Pookie Bot Blacklist',
                    userList.join('\n\n') || 'No users currently blacklisted.',
                    '#3498db'
                );
                await message.channel.send({ embeds: [embed] }).catch(console.error);

            } catch (error) {
                console.error('Error listing blacklisted users:', error);
                await message.reply({ embeds: [errorEmbed('Failed to retrieve blacklist.', `\`\`\`${error.message}\`\`\``)] }).catch(console.error);
            }

        } else {
            return message.reply({ embeds: [helpEmbed(this.name, this.usage, this.description, this.aliases)] }).catch(console.error);
        }
    },
};