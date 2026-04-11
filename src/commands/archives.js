const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readArchive } = require('../utils/archiveManager');

function toTs(iso) {
    if (!iso) return null;
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return null;
    return Math.floor(ms / 1000);
}

function trimValue(value, max = 1024) {
    const text = String(value ?? '').trim();
    if (!text) return 'Not available';
    return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function formatChecklist(entry) {
    const c = entry.closeChecklist;
    if (!c) return 'Not recorded';

    const marks = [
        `Customer notified: ${c.customerNotified ? 'Yes' : 'No'}`,
        `Work completed: ${c.workCompleted ? 'Yes' : 'No'}`,
        `Tested: ${c.tested ? 'Yes' : 'No'}`,
        `Payment received: ${c.paymentReceived ? 'Yes' : 'No'}`,
        `Device returned: ${c.deviceReturned ? 'Yes' : 'No'}`,
    ];

    if (c.notes) {
        marks.push(`Notes: ${c.notes}`);
    }

    return trimValue(marks.join('\n'));
}

function formatRecentLine(entry) {
    const customer = entry.customerName || entry.username || `User ${entry.userId}`;
    const type = entry.deviceType || 'Device';
    const ts = toTs(entry.archivedAt || entry.updatedAt || entry.createdAt);
    const when = ts ? `<t:${ts}:R>` : 'Unknown time';
    return `#${entry.ticketNumber || '?'} | ${customer} | ${type} | ${when}`;
}

function sortedArchive() {
    return readArchive().sort((a, b) => {
        const aTime = Date.parse(a.archivedAt || a.updatedAt || a.createdAt || 0);
        const bTime = Date.parse(b.archivedAt || b.updatedAt || b.createdAt || 0);
        return bTime - aTime;
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('archives')
        .setDescription('View archived closed repair tickets')
        .addSubcommand((sub) =>
            sub
                .setName('recent')
                .setDescription('Show recent archived tickets')
                .addIntegerOption((opt) =>
                    opt
                        .setName('limit')
                        .setDescription('Number of tickets to show (1-10)')
                        .setMinValue(1)
                        .setMaxValue(10),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('ticket')
                .setDescription('View an archived ticket by ticket number')
                .addIntegerOption((opt) =>
                    opt
                        .setName('number')
                        .setDescription('Ticket number')
                        .setRequired(true)
                        .setMinValue(1),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('customer')
                .setDescription('Search archived tickets by customer name')
                .addStringOption((opt) =>
                    opt
                        .setName('name')
                        .setDescription('Full or partial customer name')
                        .setRequired(true)
                        .setMaxLength(100),
                ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const archives = sortedArchive();
            if (archives.length === 0) {
                await interaction.editReply({
                    content: 'No archived closed tickets found yet.',
                });
                return;
            }

            const sub = interaction.options.getSubcommand();

            if (sub === 'recent') {
                const limit = interaction.options.getInteger('limit') || 5;
                const items = archives.slice(0, limit);
                const desc = items.map(formatRecentLine).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('Closed Ticket Archive - Recent')
                    .setColor(0x3498db)
                    .setDescription(trimValue(desc, 4000))
                    .setFooter({ text: `${archives.length} archived ticket(s) total` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            if (sub === 'ticket') {
                const number = interaction.options.getInteger('number', true);
                const found = archives.find((t) => Number(t.ticketNumber) === number);
                if (!found) {
                    await interaction.editReply({
                        content: `No archived ticket found with number #${number}.`,
                    });
                    return;
                }

                const createdTs = toTs(found.createdAt);
                const archivedTs = toTs(found.archivedAt || found.updatedAt);
                const closedBy = found.closeChecklist?.closedBy || found.closedBy;
                const techNotes = Array.isArray(found.techNotes) && found.techNotes.length > 0
                    ? found.techNotes.slice(-5).map((n, i) => `${i + 1}. ${(n.content || '').trim() || 'No content'}`).join('\n')
                    : 'No tech notes recorded';

                const preTest = found.preTestChecklist
                    ? trimValue([
                        `Display/Touch: ${found.preTestChecklist.displayTouch || 'N/A'}`,
                        `Buttons/Ports: ${found.preTestChecklist.buttonsPorts || 'N/A'}`,
                        `Camera/Audio: ${found.preTestChecklist.cameraAudio || 'N/A'}`,
                        `Power/Battery: ${found.preTestChecklist.powerBattery || 'N/A'}`,
                        `Notes: ${found.preTestChecklist.additionalNotes || 'N/A'}`,
                    ].join('\n'))
                    : 'Not recorded';

                const embed = new EmbedBuilder()
                    .setTitle(`Archived Ticket #${found.ticketNumber || '?'}`)
                    .setColor(0x2ecc71)
                    .addFields(
                        { name: 'Customer Name', value: trimValue(found.customerName || found.username || 'Unknown'), inline: true },
                        { name: 'Phone', value: trimValue(found.customerPhone || 'Not provided'), inline: true },
                        { name: 'Email', value: trimValue(found.customerEmail || 'Not provided'), inline: true },
                        { name: 'Device Type', value: trimValue(found.deviceType || 'Unknown'), inline: true },
                        { name: 'Device Model', value: trimValue(found.deviceModel || 'Unknown'), inline: true },
                        { name: 'Priority', value: trimValue(found.priority || 'Unknown'), inline: true },
                        { name: 'Issue', value: trimValue(found.issue || 'Not provided') },
                        { name: 'First-Look Pre-Test', value: preTest },
                        { name: 'Tech Notes (latest 5)', value: trimValue(techNotes) },
                        { name: 'Close Checklist', value: formatChecklist(found) },
                        { name: 'Closed By', value: closedBy ? `<@${closedBy}>` : 'Not recorded', inline: true },
                        { name: 'Created', value: createdTs ? `<t:${createdTs}:F>` : 'Unknown', inline: true },
                        { name: 'Archived', value: archivedTs ? `<t:${archivedTs}:F>` : 'Unknown', inline: true },
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            if (sub === 'customer') {
                const nameQuery = interaction.options.getString('name', true).toLowerCase();
                const matches = archives
                    .filter((t) => (t.customerName || t.username || '').toLowerCase().includes(nameQuery))
                    .slice(0, 10);

                if (matches.length === 0) {
                    await interaction.editReply({
                        content: 'No archived tickets match that customer name.',
                    });
                    return;
                }

                const lines = matches.map(formatRecentLine).join('\n');
                const embed = new EmbedBuilder()
                    .setTitle(`Archive Search - "${interaction.options.getString('name', true)}"`)
                    .setColor(0x9b59b6)
                    .setDescription(trimValue(lines, 4000))
                    .setFooter({ text: `${matches.length} result(s)` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            await interaction.editReply({
                content: 'Unknown archives subcommand.',
            });
        } catch (err) {
            console.error('Error in /archives:', err);
            const payload = { content: '❌ The archives command failed. Please try again.' };
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(payload).catch(async () => {
                    await interaction.followUp({ ...payload, ephemeral: true }).catch(() => {});
                });
            } else {
                await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
            }
        }
    },
};
