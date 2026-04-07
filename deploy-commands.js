// =============================================
// Unified Bot — Slash Command Deployer
// Run with: node deploy-commands.js
//
// Registers commands as GUILD commands for instant
// availability. Add all your server IDs to GUILD_IDS.
// (Global commands can take up to 1 hour to appear)
// =============================================

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

// Add every server ID the bot lives in here for instant commands
// Get a server ID: Developer Mode on → right-click server → Copy Server ID
const GUILD_IDS = process.env.GUILD_IDS
	? process.env.GUILD_IDS.split(',').map(id => id.trim())
	: [];

// Commands only visible in your private guild (owner-only stuff)
const PRIVATE_COMMAND_NAMES = ['hiddenmsg'];

const allCommands = [];
const privateCommands = [];

// Recursively collect all .js files from commands/ and its subdirectories
function collectCommandFiles(dir) {
	const results = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...collectCommandFiles(full));
		} else if (entry.name.endsWith('.js')) {
			results.push(full);
		}
	}
	return results;
}

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = collectCommandFiles(commandsPath);

for (const file of commandFiles) {
	const command = require(file);
	if ('data' in command && 'execute' in command) {
		if (PRIVATE_COMMAND_NAMES.includes(command.data.name)) {
			privateCommands.push(command.data.toJSON());
		} else {
			allCommands.push(command.data.toJSON());
		}
	}
}

// Log every command that was loaded so we can spot bad data
console.log('Commands loaded:', allCommands.map(c => c.name).join(', '));

// 15-second timeout — fails fast instead of hanging forever
const rest = new REST({ timeout: 15_000 }).setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		if (GUILD_IDS.length > 0) {
			// Register to specific guilds — shows up INSTANTLY
			for (const guildId of GUILD_IDS) {
				console.log(`\nRegistering ${allCommands.length} command(s) in guild ${guildId}...`);
				await rest.put(
					Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
					{ body: allCommands },
				);
				console.log(`✅ Done for guild ${guildId}`);
			}
		} else {
			// Fallback: register globally (up to 1 hour to appear)
			console.log(`\nRegistering ${allCommands.length} global command(s)...`);
			await rest.put(
				Routes.applicationCommands(process.env.CLIENT_ID),
				{ body: allCommands },
			);
			console.log(`✅ Global commands registered.`);
		}

		// Always register private commands in the private guild
		if (privateCommands.length > 0 && process.env.PRIVATE_GUILD_ID) {
			console.log(`\nRegistering ${privateCommands.length} private command(s) in guild ${process.env.PRIVATE_GUILD_ID}...`);
			await rest.put(
				Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.PRIVATE_GUILD_ID),
				{ body: privateCommands },
			);
			console.log(`✅ Private commands registered.`);
		}
	} catch (error) {
		console.error('❌ Failed to register commands:', error.message ?? error);
		process.exit(1);
	}
})();
