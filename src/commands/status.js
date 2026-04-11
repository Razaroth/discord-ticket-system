const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicket, updateTicket } = require('../utils/ticketManager');
const { ticketEmbed, buildStaffActionRows } = require('../utils/embeds');
const { archiveClosedTicket } = require('../utils/archiveManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Update the status of this ticket')
        .addStringOption(opt =>
            opt.setName('status')
                .setDescription('New status')
                .setRequired(true)
                .addChoices(
                    { name: '🟢 Open', value: 'Open' },
                    { name: '🔧 In Progress', value: 'In Progress' },
                    { name: '🔴 Closed', value: 'Closed' },
                ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const status = interaction.options.getString('status');
        const ticket = getTicket(interaction.channelId);

        if (!ticket) {
            return interaction.reply({ content: '❌ This command must be used inside a ticket channel.', ephemeral: true });
        }

        const updated = updateTicket(interaction.channelId, { status });
        if (status === 'Closed') {
            archiveClosedTicket(updated, {
                closedBy: interaction.user.id,
                closeSource: 'slash-status-closed',
            });
        }

        if (updated.embedMessageId) {
            try {
                const msg = await interaction.channel.messages.fetch(updated.embedMessageId);
                await msg.edit({ embeds: [ticketEmbed(updated)], components: buildStaffActionRows(updated) });
            } catch { /* Message may have been deleted */ }
        }

        await interaction.reply({ content: `✅ Status updated to **${status}**.` });
    },
};
