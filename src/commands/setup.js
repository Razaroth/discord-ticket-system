const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Post the repair ticket panel in this channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔧 Phone & Computer Repair — Open a Ticket')
            .setColor(0x5865f2)
            .setDescription(
                'Need a repair? Click the button below to get started.\n\n' +
                '📱 **Phone Repairs** — Cracked screens, battery replacement, water damage, charging ports & more\n' +
                '💻 **Computer Repairs** — Hardware failures, software issues, virus removal, upgrades & more\n\n' +
                'A technician will be assigned to your ticket shortly after submission.',
            )
            .setFooter({ text: 'Repair Ticket System • Click below to begin' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('Open a Repair Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫'),
        );

        await interaction.reply({ content: '✅ Ticket panel deployed!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },
};
