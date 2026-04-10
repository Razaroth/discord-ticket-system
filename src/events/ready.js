const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`📋 Serving ${client.guilds.cache.size} guild(s)`);
        console.log(`🔧 Repair Ticket Bot is ready.`);
    },
};
