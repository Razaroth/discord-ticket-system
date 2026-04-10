const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicket, updateTicket } = require('../utils/ticketManager');
const { ticketEmbed, buildStaffActionRow } = require('../utils/embeds');

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

        if (updated.embedMessageId) {
            try {
                const msg = await interaction.channel.messages.fetch(updated.embedMessageId);
                await msg.edit({ embeds: [ticketEmbed(updated)], components: [buildStaffActionRow(updated)] });
            } catch { /* Message may have been deleted */ }
        }

        await interaction.reply({ content: `✅ Status updated to **${status}**.` });
    },
};
