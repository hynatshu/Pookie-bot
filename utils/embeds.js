// utils/embeds.js
const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.json');

const createEmbed = (title, description, color = '#3498db', fields = [], footerText = `Pookie Bot | ${new Date().toLocaleDateString()}`) => {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: footerText });

    if (fields.length > 0) {
        embed.addFields(fields);
    }
    return embed;
};

const errorEmbed = (description, solution = 'Please check your input or contact a bot administrator if the issue persists.', title = 'Error ❌') => {
    return createEmbed(title, description, '#e74c3c', [{ name: 'Solution', value: solution }]);
};

const successEmbed = (description, title = 'Success ✅') => {
    return createEmbed(title, description, '#2ecc71');
};

const warningEmbed = (description, title = 'Warning ⚠️') => {
    return createEmbed(title, description, '#f39c12');
};

const helpEmbed = (commandName, usage, description, aliases = []) => {
    const fields = [
        { name: 'Usage', value: `\`${usage}\`` },
        { name: 'Description', value: description }
    ];
    if (aliases.length > 0) {
        fields.push({ name: 'Aliases', value: aliases.map(a => `\`${a}\``).join(', ') });
    }
    return createEmbed(`Command: ${commandName}`, '', '#3498db', fields, `Pookie Bot | ${commandName} Help`);
};


module.exports = {
    createEmbed,
    errorEmbed,
    successEmbed,
    warningEmbed,
    helpEmbed
};