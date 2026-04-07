// =============================================
// Unified Bot — Entry Point
// Loads commands recursively from subdirectories,
// loads events, initialises Lavalink raw forwarding
// =============================================

const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
require('dotenv').config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions, // required by discord-giveaways
	],
});

client.commands = new Collection();

// --- Recursively load commands from all subdirectories ---
function loadCommands(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			loadCommands(fullPath); // recurse into subfolder
		} else if (entry.name.endsWith('.js')) {
			const command = require(fullPath);
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				console.warn(`[WARNING] ${fullPath} is missing 'data' or 'execute' — skipped`);
			}
		}
	}
}
loadCommands(path.join(__dirname, 'commands'));

// --- Load events ---
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
	const event = require(path.join(eventsPath, file));
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// --- Forward raw packets to Lavalink (required for voice) ---
client.on('raw', (d) => {
	if (client.lavalink) client.lavalink.sendRawData(d);
});

client.login(process.env.DISCORD_TOKEN);
