const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

const PRIORITY_COLORS = {
    Low: 0x57f287,
    Medium: 0xfee75c,
    High: 0xe67e22,
    Urgent: 0xed4245,
};

const STATUS_EMOJIS = {
    Open: '🟢',
    'In Progress': '🔧',
    Closed: '🔴',
};

const DEVICE_EMOJIS = {
    Phone: '📱',
    Computer: '💻',
};

function ticketEmbed(ticket) {
    const color = PRIORITY_COLORS[ticket.priority] || 0x5865f2;
    const createdTs = Math.floor(new Date(ticket.createdAt).getTime() / 1000);

    return new EmbedBuilder()
        .setTitle(`${DEVICE_EMOJIS[ticket.deviceType] || '🔧'} Repair Ticket #${ticket.ticketNumber}`)
        .setColor(color)
        .addFields(
            { name: '👤 Customer', value: `<@${ticket.userId}>`, inline: true },
            { name: '📋 Status', value: `${STATUS_EMOJIS[ticket.status] || ''} ${ticket.status}`, inline: true },
            { name: '⚡ Priority', value: ticket.priority, inline: true },
            { name: `${DEVICE_EMOJIS[ticket.deviceType] || '🔧'} Device Type`, value: ticket.deviceType, inline: true },
            { name: '📱 Device Model', value: ticket.deviceModel, inline: true },
            { name: '🔧 Assigned To', value: ticket.assignedTo ? `<@${ticket.assignedTo}>` : 'Unassigned', inline: true },
            { name: '📝 Issue Description', value: ticket.issue },
            { name: '📅 Due Date', value: ticket.dueDate || 'Not set', inline: true },
            { name: '🕐 Created', value: `<t:${createdTs}:R>`, inline: true },
        )
        .setFooter({ text: `Ticket ID: ${ticket.id}` })
        .setTimestamp();
}

function ticketListEmbed(tickets) {
    const open = tickets.filter(t => t.status !== 'Closed');

    const embed = new EmbedBuilder()
        .setTitle('📋 Repair Tickets — Overview')
        .setColor(0x5865f2)
        .setTimestamp();

    const byStatus = {
        Open: tickets.filter(t => t.status === 'Open'),
        'In Progress': tickets.filter(t => t.status === 'In Progress'),
        Closed: tickets.filter(t => t.status === 'Closed'),
    };

    embed.addFields(
        { name: '🟢 Open', value: String(byStatus.Open.length), inline: true },
        { name: '🔧 In Progress', value: String(byStatus['In Progress'].length), inline: true },
        { name: '🔴 Closed', value: String(byStatus.Closed.length), inline: true },
    );

    const active = open.slice(0, 10);
    if (active.length > 0) {
        embed.addFields({ name: '\u200b', value: '**Active Tickets**' });
        for (const t of active) {
            embed.addFields({
                name: `#${t.ticketNumber} — ${DEVICE_EMOJIS[t.deviceType] || ''} ${t.deviceType} (${t.priority})`,
                value: `**Status:** ${STATUS_EMOJIS[t.status] || ''} ${t.status}  |  **Assigned:** ${t.assignedTo ? `<@${t.assignedTo}>` : 'Unassigned'}\n**Customer:** <@${t.userId}>  |  **Model:** ${t.deviceModel}\n**Channel:** <#${t.id}>`,
            });
        }
    } else {
        embed.setDescription('✅ No active tickets right now.');
    }

    embed.setFooter({ text: `${open.length} active ticket${open.length !== 1 ? 's' : ''}` });
    return embed;
}

function buildStaffActionRow(ticket) {
    const row = new ActionRowBuilder();

    if (ticket.status === 'Closed') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('delete_ticket_channel')
                .setLabel('Delete Channel')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️'),
        );
        return row;
    }

    row.addComponents(
        new ButtonBuilder()
            .setCustomId('assign_ticket')
            .setLabel('Assign to Me')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('👤'),
    );

    if (ticket.status === 'Open') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('status_in_progress')
                .setLabel('In Progress')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔧'),
        );
    } else {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('status_reopen')
                .setLabel('Reopen')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄'),
        );
    }

    row.addComponents(
        new ButtonBuilder()
            .setCustomId('change_priority')
            .setLabel('Priority')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⚡'),
        new ButtonBuilder()
            .setCustomId('set_due_date')
            .setLabel('Set Due Date')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📅'),
        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
    );

    return row;
}

module.exports = {
    ticketEmbed,
    ticketListEmbed,
    buildStaffActionRow,
    PRIORITY_COLORS,
    STATUS_EMOJIS,
    DEVICE_EMOJIS,
};
