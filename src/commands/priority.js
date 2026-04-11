const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicket, updateTicket } = require('../utils/ticketManager');
const { ticketEmbed, buildStaffActionRows } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('priority')
        .setDescription('Update the priority of this ticket')
        .addStringOption(opt =>
            opt.setName('level')
                .setDescription('New priority level')
                .setRequired(true)
                .addChoices(
                    { name: '🟢 Low', value: 'Low' },
                    { name: '🟡 Medium', value: 'Medium' },
                    { name: '🟠 High', value: 'High' },
                    { name: '🔴 Urgent', value: 'Urgent' },
                ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const priority = interaction.options.getString('level');
        const ticket = getTicket(interaction.channelId);

        if (!ticket) {
            return interaction.reply({ content: '❌ This command must be used inside a ticket channel.', ephemeral: true });
        }

        const updated = updateTicket(interaction.channelId, { priority });

        if (updated.embedMessageId) {
            try {
                const msg = await interaction.channel.messages.fetch(updated.embedMessageId);
                await msg.edit({ embeds: [ticketEmbed(updated)], components: buildStaffActionRows(updated) });
            } catch { /* Message may have been deleted */ }
        }

        await interaction.reply({ content: `⚡ Priority updated to **${priority}**.` });
    },
};
