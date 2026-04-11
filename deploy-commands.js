require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { guildId } = require('./config.json');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
    const command = require(path.join(commandsPath, file));
    if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log(`Deploying ${commands.length} slash commands to guild ${guildId}...`);
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
            { body: commands },
        );
        console.log('✅ Slash commands deployed successfully.');
    } catch (err) {
        console.error('Failed to deploy commands:', err);
        process.exit(1);
    }
})();
