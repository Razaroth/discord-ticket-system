const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicket, updateTicket } = require('../utils/ticketManager');
const { ticketEmbed, buildStaffActionRows } = require('../utils/embeds');
const { archiveClosedTicket } = require('../utils/archiveManager');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close this repair ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const ticket = getTicket(interaction.channelId);

        if (!ticket) {
            return interaction.reply({ content: '❌ This command must be used inside a ticket channel.', ephemeral: true });
        }
        if (ticket.status === 'Closed') {
            return interaction.reply({ content: '⚠️ This ticket is already closed.', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const updated = updateTicket(interaction.channelId, { status: 'Closed' });
            archiveClosedTicket(updated, {
                closedBy: interaction.user.id,
                closeSource: 'slash-close',
            });

            // Revoke customer send permissions
            await interaction.channel.permissionOverwrites.edit(ticket.userId, {
                SendMessages: false,
                AddReactions: false,
            });

            // Rename the channel
            await interaction.channel.setName(
                `closed-${ticket.ticketNumber}-${ticket.deviceType.toLowerCase()}`,
            );

            // Update embed
            if (updated.embedMessageId) {
                try {
                    const msg = await interaction.channel.messages.fetch(updated.embedMessageId);
                    await msg.edit({ embeds: [ticketEmbed(updated)], components: buildStaffActionRows(updated) });
                } catch { /* Message may have been deleted */ }
            }

            // Log closure
            if (config.logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                if (logChannel) {
                    await logChannel.send({
                        content: `🔒 Ticket **#${updated.ticketNumber}** closed by <@${interaction.user.id}>`,
                        embeds: [ticketEmbed(updated)],
                    });
                }
            }

            await interaction.editReply({
                content: `🔒 Ticket **#${ticket.ticketNumber}** has been closed by <@${interaction.user.id}>.`,
            });
        } catch (err) {
            console.error('Error in /close:', err);
            await interaction.editReply({ content: '❌ An error occurred while closing the ticket.' });
        }
    },
};
