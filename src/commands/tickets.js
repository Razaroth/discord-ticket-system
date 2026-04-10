const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getAllTickets } = require('../utils/ticketManager');
const { ticketListEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('Show an overview of all repair tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const tickets = getAllTickets();
        const embed = ticketListEmbed(tickets);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
