const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicket, updateTicket } = require('../utils/ticketManager');
const { ticketEmbed, buildStaffActionRow } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assign')
        .setDescription('Assign a technician to this ticket')
        .addUserOption(opt =>
            opt.setName('technician')
                .setDescription('The staff member to assign')
                .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const tech = interaction.options.getUser('technician');
        const ticket = getTicket(interaction.channelId);

        if (!ticket) {
            return interaction.reply({ content: '❌ This command must be used inside a ticket channel.', ephemeral: true });
        }

        const updated = updateTicket(interaction.channelId, {
            assignedTo: tech.id,
            assignedName: tech.username,
        });

        if (updated.embedMessageId) {
            try {
                const msg = await interaction.channel.messages.fetch(updated.embedMessageId);
                await msg.edit({ embeds: [ticketEmbed(updated)], components: [buildStaffActionRow(updated)] });
            } catch { /* Message may have been deleted */ }
        }

        await interaction.reply({ content: `✅ Ticket assigned to <@${tech.id}>.` });
    },
};
