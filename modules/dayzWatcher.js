// =============================================
// Module: dayzWatcher
// Polls DayZ game servers using gamedig (A2S protocol)
// and posts/updates a status embed in a Discord channel.
// Server list is managed via /dayz commands and persisted
// in settings/servers.json.
// =============================================

const GameDig = require('gamedig');
const { EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const SERVERS_FILE = path.join(__dirname, '../settings/servers.json');
const POLL_INTERVAL = 60 * 1000; // 60 seconds

// --- Read servers from disk ---
function loadServers() {
	try {
		return JSON.parse(fs.readFileSync(SERVERS_FILE, 'utf8'));
	} catch {
		return [];
	}
}

// --- Write servers to disk ---
function saveServers(servers) {
	fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers, null, 2), 'utf8');
}

// --- Extract in-game time from DayZ A2S tags ---
// DayZ encodes time as e.g. "lqs-1,etm5.14,tzhr14,tzmin30"
function getTimeEmoji(tags) {
	try {
		if (!tags) return '🕑';
		// HH:MM format
		const lastPart = tags.split(',').pop()?.trim() ?? '';
		if (/^\d{2}:\d{2}$/.test(lastPart)) {
			return (lastPart >= '05:00' && lastPart < '20:00') ? '🌕' : '🌑';
		}
		// tzhr/tzmin format
		const hrMatch = tags.match(/tzhr(\d+)/);
		if (hrMatch) {
			const hr = parseInt(hrMatch[1], 10);
			return (hr >= 5 && hr < 20) ? '🌕' : '🌑';
		}
		return '🕑';
	} catch {
		return '🕑';
	}
}

// --- Build online embed ---
function buildOnlineEmbed(serverName, state) {
	const tags = state.raw?.tags ?? state.raw?.keywords ?? '';
	const timeEmoji = getTimeEmoji(tags);
	const players = state.players?.length ?? 0;
	const maxPlayers = state.maxplayers ?? 0;

	const hrMatch = tags.match(/tzhr(\d+)/);
	const minMatch = tags.match(/tzmin(\d+)/);
	let timeStr = 'Unknown';
	if (hrMatch) {
		const hr = String(parseInt(hrMatch[1], 10)).padStart(2, '0');
		const min = minMatch ? String(parseInt(minMatch[1], 10)).padStart(2, '0') : '00';
		timeStr = `${hr}:${min}`;
	}

	return new EmbedBuilder()
		.setTitle(`${serverName} ${timeEmoji}`)
		.setDescription('🟢 **Server Online**')
		.setColor(0x00B000)
		.addFields(
			{ name: 'Players', value: `${players} / ${maxPlayers}`, inline: true },
			{ name: 'In-Game Time', value: timeStr, inline: true },
		)
		.setTimestamp()
		.setFooter({ text: 'Updates every 60 seconds' });
}

// --- Build offline embed ---
function buildOfflineEmbed(serverName) {
	return new EmbedBuilder()
		.setTitle(`${serverName} 🔴`)
		.setDescription('🔴 **Server Offline**')
		.setColor(0xF00000)
		.setTimestamp()
		.setFooter({ text: 'Updates every 60 seconds' });
}

// --- Poll one server and update its embed ---
// Exported so /dayz refresh can call it directly
async function updateServerEmbed(client, server) {
	const channel = await client.channels.fetch(server.channelId).catch(() => null);
	if (!channel) {
		console.error(`[DayZ] Channel ${server.channelId} not found for "${server.name}"`);
		return;
	}

	// Query the server
	let embed;
	try {
		const state = await GameDig.query({
			type: 'dayz',
			host: server.ip,
			port: server.port,
			givenPortOnly: true,
		});
		embed = buildOnlineEmbed(server.name, state);
	} catch {
		embed = buildOfflineEmbed(server.name);
	}

	// Edit existing embed if we have a messageId
	if (server.messageId) {
		try {
			const existing = await channel.messages.fetch(server.messageId);
			await existing.edit({ embeds: [embed] });
			return;
		} catch {
			// Message gone — post a new one
		}
	}

	// Post new embed and save its ID
	const posted = await channel.send({ embeds: [embed] });
	server.messageId = posted.id;

	// Persist the new messageId
	const servers = loadServers();
	const entry = servers.find(s => s.name === server.name);
	if (entry) {
		entry.messageId = posted.id;
		saveServers(servers);
	}
}

// --- Start the polling loop — called from events/ready.js ---
async function startDayzWatcher(client) {
	const servers = loadServers();

	if (!servers.length) {
		console.log('[DayZ] No servers in servers.json — use /dayz add to add one.');
		return;
	}

	console.log(`[DayZ] Starting watcher for ${servers.length} server(s)`);

	// Initial update on startup
	for (const server of servers) {
		await updateServerEmbed(client, server).catch(err =>
			console.error(`[DayZ] Startup failed for "${server.name}":`, err.message),
		);
	}

	// Poll every 60 seconds — re-reads file each tick so /dayz add/remove take effect automatically
	setInterval(async () => {
		const current = loadServers();
		for (const server of current) {
			await updateServerEmbed(client, server).catch(err =>
				console.error(`[DayZ] Update failed for "${server.name}":`, err.message),
			);
		}
	}, POLL_INTERVAL);
}

module.exports = { startDayzWatcher, updateServerEmbed, loadServers, saveServers };
