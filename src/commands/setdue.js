const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicket, updateTicket } = require('../utils/ticketManager');
const { ticketEmbed, buildStaffActionRow } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setdue')
        .setDescription('Set the due date for this ticket')
        .addStringOption(opt =>
            opt.setName('date')
                .setDescription('Due date (e.g. "April 15, 2026" or "2026-04-15")')
                .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const dueDate = interaction.options.getString('date');
        const ticket = getTicket(interaction.channelId);

        if (!ticket) {
            return interaction.reply({ content: '❌ This command must be used inside a ticket channel.', ephemeral: true });
        }

        const updated = updateTicket(interaction.channelId, { dueDate });

        if (updated.embedMessageId) {
            try {
                const msg = await interaction.channel.messages.fetch(updated.embedMessageId);
                await msg.edit({ embeds: [ticketEmbed(updated)], components: [buildStaffActionRow(updated)] });
            } catch { /* Message may have been deleted */ }
        }

        await interaction.reply({ content: `📅 Due date set to **${dueDate}**.` });
    },
};
