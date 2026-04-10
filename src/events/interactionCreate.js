const {
    Events,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    PermissionsBitField,
} = require('discord.js');

const { createTicket, getTicket, updateTicket, deleteTicket } = require('../utils/ticketManager');
const { ticketEmbed, buildStaffActionRow } = require('../utils/embeds');
const config = require('../../config.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasStaffPermission(member) {
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    if (member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return true;
    if (config.staffRoleId && member.roles.cache.has(config.staffRoleId)) return true;
    return false;
}

async function updateTicketEmbed(channel, ticket) {
    if (!ticket.embedMessageId) return;
    try {
        const msg = await channel.messages.fetch(ticket.embedMessageId);
        await msg.edit({
            embeds: [ticketEmbed(ticket)],
            components: [buildStaffActionRow(ticket)],
        });
    } catch {
        // Message may have been deleted — ignore
    }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction, client) {
        // ── Slash Commands ────────────────────────────────────────────────────
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client);
            } catch (err) {
                console.error(`Error in /${interaction.commandName}:`, err);
                const payload = { content: '❌ An error occurred while running that command.', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(payload).catch(() => {});
                } else {
                    await interaction.reply(payload).catch(() => {});
                }
            }
            return;
        }

        // ── Button: Create Ticket (panel) ─────────────────────────────────────
        if (interaction.isButton() && interaction.customId === 'create_ticket') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_device_type')
                    .setPlaceholder('Select device type...')
                    .addOptions([
                        { label: '📱 Phone', value: 'Phone', description: 'Smartphone or tablet repair' },
                        { label: '💻 Computer', value: 'Computer', description: 'Desktop or laptop repair' },
                    ]),
            );
            await interaction.reply({
                content: '**Step 1 of 3** — What type of device needs repair?',
                components: [row],
                ephemeral: true,
            });
            return;
        }

        // ── Select: Device Type ───────────────────────────────────────────────
        if (interaction.isStringSelectMenu() && interaction.customId === 'select_device_type') {
            const deviceType = interaction.values[0];
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`select_priority:${deviceType}`)
                    .setPlaceholder('Select priority level...')
                    .addOptions([
                        { label: '🟢 Low', value: 'Low', description: 'Minor issue, no rush' },
                        { label: '🟡 Medium', value: 'Medium', description: 'Needs attention soon' },
                        { label: '🟠 High', value: 'High', description: 'Significant issue affecting use' },
                        { label: '🔴 Urgent', value: 'Urgent', description: 'Critical — device unusable' },
                    ]),
            );
            await interaction.update({
                content: `**Step 2 of 3** — Priority for your **${deviceType}** repair?`,
                components: [row],
            });
            return;
        }

        // ── Select: Priority ──────────────────────────────────────────────────
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_priority:')) {
            const deviceType = interaction.customId.split(':')[1];
            const priority = interaction.values[0];

            const modal = new ModalBuilder()
                .setCustomId(`ticket_modal:${deviceType}:${priority}`)
                .setTitle(`${deviceType} Repair — ${priority} Priority`);

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('device_model')
                        .setLabel('Device Model')
                        .setPlaceholder('e.g. iPhone 15 Pro, Dell XPS 15, Samsung Galaxy S24')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(100),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('issue_description')
                        .setLabel('Describe the issue')
                        .setPlaceholder('Please describe the problem in as much detail as possible...')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMaxLength(1000),
                ),
            );

            await interaction.showModal(modal);
            return;
        }

        // ── Modal: Ticket Submission ──────────────────────────────────────────
        if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal:')) {
            const parts = interaction.customId.split(':');
            const deviceType = parts[1];
            const priority = parts[2];
            const deviceModel = interaction.fields.getTextInputValue('device_model');
            const issue = interaction.fields.getTextInputValue('issue_description');

            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;
            let category = null;
            if (config.ticketsCategoryId) {
                category = guild.channels.cache.get(config.ticketsCategoryId) ?? null;
            }

            // Create the private ticket channel
            const permissionOverwrites = [
                {
                    id: guild.roles.everyone,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.AttachFiles,
                    ],
                },
            ];

            if (config.staffRoleId) {
                permissionOverwrites.push({
                    id: config.staffRoleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.ManageMessages,
                        PermissionsBitField.Flags.AttachFiles,
                    ],
                });
            }

            try {
                const ticketChannel = await guild.channels.create({
                    name: 'ticket-new',
                    type: ChannelType.GuildText,
                    parent: category?.id ?? null,
                    permissionOverwrites,
                });

                // Save ticket to storage
                const ticket = createTicket(ticketChannel.id, {
                    userId: interaction.user.id,
                    username: interaction.user.username,
                    deviceType,
                    deviceModel,
                    issue,
                    priority,
                });

                // Rename channel with ticket number
                await ticketChannel.setName(`ticket-${ticket.ticketNumber}-${deviceType.toLowerCase()}`);

                // Send ticket embed with staff action buttons
                const staffMention = config.staffRoleId ? ` <@&${config.staffRoleId}>` : '';
                const embedMsg = await ticketChannel.send({
                    content: `<@${interaction.user.id}>${staffMention}`,
                    embeds: [ticketEmbed(ticket)],
                    components: [buildStaffActionRow(ticket)],
                });

                // Store the embed message ID so we can edit it later
                updateTicket(ticketChannel.id, { embedMessageId: embedMsg.id });

                await interaction.editReply({
                    content: `✅ Your repair ticket has been created! Head to <#${ticketChannel.id}>.`,
                });
            } catch (err) {
                console.error('Failed to create ticket channel:', err);
                await interaction.editReply({ content: '❌ Failed to create ticket channel. Please contact an administrator.' });
            }
            return;
        }

        // ── Staff-Only Button/Select Handlers ─────────────────────────────────
        const staffButtonIds = [
            'assign_ticket', 'status_in_progress', 'status_reopen',
            'change_priority', 'set_due_date', 'close_ticket',
            'confirm_close', 'delete_ticket_channel',
        ];

        if (
            (interaction.isButton() && staffButtonIds.includes(interaction.customId)) ||
            (interaction.isStringSelectMenu() && interaction.customId === 'update_priority')
        ) {
            if (!hasStaffPermission(interaction.member)) {
                await interaction.reply({ content: '❌ You do not have permission to use staff controls.', ephemeral: true });
                return;
            }
        }

        // ── Button: Assign to Me ──────────────────────────────────────────────
        if (interaction.isButton() && interaction.customId === 'assign_ticket') {
            await interaction.deferReply();
            const ticket = getTicket(interaction.channelId);
            if (!ticket) { await interaction.editReply({ content: '❌ Ticket data not found.' }); return; }

            const updated = updateTicket(interaction.channelId, {
                assignedTo: interaction.user.id,
                assignedName: interaction.user.username,
            });
            await updateTicketEmbed(interaction.channel, updated);
            await interaction.editReply({ content: `✅ <@${interaction.user.id}> has been assigned to this ticket.` });
            return;
        }

        // ── Button: Set In Progress ───────────────────────────────────────────
        if (interaction.isButton() && interaction.customId === 'status_in_progress') {
            await interaction.deferReply();
            const ticket = getTicket(interaction.channelId);
            if (!ticket) { await interaction.editReply({ content: '❌ Ticket data not found.' }); return; }

            const updated = updateTicket(interaction.channelId, { status: 'In Progress' });
            await updateTicketEmbed(interaction.channel, updated);
            await interaction.editReply({ content: `🔧 Status updated to **In Progress** by <@${interaction.user.id}>.` });
            return;
        }

        // ── Button: Reopen ────────────────────────────────────────────────────
        if (interaction.isButton() && interaction.customId === 'status_reopen') {
            await interaction.deferReply();
            const ticket = getTicket(interaction.channelId);
            if (!ticket) { await interaction.editReply({ content: '❌ Ticket data not found.' }); return; }

            const updated = updateTicket(interaction.channelId, { status: 'Open' });
            await updateTicketEmbed(interaction.channel, updated);
            await interaction.editReply({ content: `🟢 Ticket reopened by <@${interaction.user.id}>.` });
            return;
        }

        // ── Button: Change Priority ───────────────────────────────────────────
        if (interaction.isButton() && interaction.customId === 'change_priority') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('update_priority')
                    .setPlaceholder('Select new priority...')
                    .addOptions([
                        { label: '🟢 Low', value: 'Low' },
                        { label: '🟡 Medium', value: 'Medium' },
                        { label: '🟠 High', value: 'High' },
                        { label: '🔴 Urgent', value: 'Urgent' },
                    ]),
            );
            await interaction.reply({ content: 'Select a new priority level:', components: [row], ephemeral: true });
            return;
        }

        // ── Select: Update Priority ───────────────────────────────────────────
        if (interaction.isStringSelectMenu() && interaction.customId === 'update_priority') {
            await interaction.deferUpdate();
            const priority = interaction.values[0];
            const ticket = getTicket(interaction.channelId);
            if (!ticket) { await interaction.editReply({ content: '❌ Ticket data not found.', components: [] }); return; }

            const updated = updateTicket(interaction.channelId, { priority });
            await updateTicketEmbed(interaction.channel, updated);
            await interaction.editReply({ content: `⚡ Priority updated to **${priority}** by <@${interaction.user.id}>.`, components: [] });
            await interaction.channel.send({ content: `⚡ Priority changed to **${priority}** by <@${interaction.user.id}>.` });
            return;
        }

        // ── Button: Set Due Date ──────────────────────────────────────────────
        if (interaction.isButton() && interaction.customId === 'set_due_date') {
            const modal = new ModalBuilder()
                .setCustomId('due_date_modal')
                .setTitle('Set Due Date');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('due_date_value')
                        .setLabel('Due Date')
                        .setPlaceholder('e.g. April 15, 2026 or 2026-04-15')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(50),
                ),
            );
            await interaction.showModal(modal);
            return;
        }

        // ── Modal: Due Date ───────────────────────────────────────────────────
        if (interaction.isModalSubmit() && interaction.customId === 'due_date_modal') {
            await interaction.deferReply();
            const dueDate = interaction.fields.getTextInputValue('due_date_value');
            const ticket = getTicket(interaction.channelId);
            if (!ticket) { await interaction.editReply({ content: '❌ Ticket data not found.' }); return; }

            const updated = updateTicket(interaction.channelId, { dueDate });
            await updateTicketEmbed(interaction.channel, updated);
            await interaction.editReply({ content: `📅 Due date set to **${dueDate}** by <@${interaction.user.id}>.` });
            return;
        }

        // ── Button: Close Ticket ──────────────────────────────────────────────
        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_close')
                    .setLabel('Confirm Close')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_close')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary),
            );
            await interaction.reply({
                content: '⚠️ Are you sure you want to close this ticket?',
                components: [row],
                ephemeral: true,
            });
            return;
        }

        // ── Button: Confirm Close ─────────────────────────────────────────────
        if (interaction.isButton() && interaction.customId === 'confirm_close') {
            await interaction.deferUpdate();
            const ticket = getTicket(interaction.channelId);
            if (!ticket) { await interaction.editReply({ content: '❌ Ticket data not found.', components: [] }); return; }
            if (ticket.status === 'Closed') { await interaction.editReply({ content: '⚠️ Already closed.', components: [] }); return; }

            try {
                const updated = updateTicket(interaction.channelId, { status: 'Closed' });

                // Revoke customer's ability to send messages
                await interaction.channel.permissionOverwrites.edit(ticket.userId, {
                    SendMessages: false,
                    AddReactions: false,
                });

                // Rename channel
                await interaction.channel.setName(
                    `closed-${ticket.ticketNumber}-${ticket.deviceType.toLowerCase()}`,
                );

                // Update the embed
                await updateTicketEmbed(interaction.channel, updated);

                // Log to log channel if configured
                if (config.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                    if (logChannel) {
                        await logChannel.send({
                            content: `🔒 Ticket **#${updated.ticketNumber}** closed by <@${interaction.user.id}>`,
                            embeds: [ticketEmbed(updated)],
                        });
                    }
                }

                await interaction.editReply({ content: '✅ Ticket closed.', components: [] });

                // Post closure notice with delete button for staff
                const deleteRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('delete_ticket_channel')
                        .setLabel('Delete Channel')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️'),
                );
                await interaction.channel.send({
                    content: `🔒 Ticket closed by <@${interaction.user.id}>. Staff may delete this channel when ready.`,
                    components: [deleteRow],
                });
            } catch (err) {
                console.error('Error closing ticket:', err);
                await interaction.editReply({ content: '❌ An error occurred while closing the ticket.', components: [] });
            }
            return;
        }

        // ── Button: Cancel Close ──────────────────────────────────────────────
        if (interaction.isButton() && interaction.customId === 'cancel_close') {
            await interaction.update({ content: '✅ Close cancelled.', components: [] });
            return;
        }

        // ── Button: Delete Channel ────────────────────────────────────────────
        if (interaction.isButton() && interaction.customId === 'delete_ticket_channel') {
            await interaction.deferReply({ ephemeral: true });
            await interaction.editReply({ content: '🗑️ Deleting channel in 5 seconds...' });
            deleteTicket(interaction.channelId);
            setTimeout(() => {
                interaction.channel.delete(`Ticket deleted by ${interaction.user.tag}`).catch(console.error);
            }, 5000);
            return;
        }
    },
};
