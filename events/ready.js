// =============================================
// Event: ClientReady
// - Syncs DB tables
// - Initialises Lavalink v4 client
// - Initialises Giveaways manager
// - Starts Nitrado cron + DayZ watcher
// =============================================

const { Events } = require('discord.js');
const { LavalinkManager } = require('lavalink-client');
const fs = require('node:fs');
const path = require('node:path');
const { GiveawaysManager } = require('discord-giveaways');
const cron = require('node-cron');
const db = require('../database.js');
const messageUpdater = require('../modules/messageUpdater.js');
const { startDayzWatcher } = require('../modules/dayzWatcher.js');

module.exports = {
	name: Events.ClientReady,
	once: true,

	async execute(client) {
		// --- Sync all DB tables ---
		await db.Server.sync({ alter: true });
		await db.ServerInfoCron.sync({ alter: true });
		await db.User.sync({ alter: true });
		await db.Warning.sync({ alter: true });
		await db.Ticket.sync({ alter: true });
		console.log('[DB] All tables synced.');

		// --- Lavalink v4 client ---
		client.lavalink = new LavalinkManager({
			nodes: [{
				id: 'main',
				host: process.env.LAVALINK_HOST,
				port: Number(process.env.LAVALINK_PORT),
				authorization: process.env.LAVALINK_PASSWORD,
				secure: process.env.LAVALINK_SECURE === 'true',
			}],
			sendToShard: (guildId, payload) =>
				client.guilds.cache.get(guildId)?.shard?.send(payload),
			client: {
				id: process.env.CLIENT_ID,
				username: client.user.username,
			},
			autoSkip: true,
		});

		// --- Node connection events ---
		client.lavalink.nodeManager.on('connect', (node) =>
			console.log(`[Lavalink] Node "${node.id}" connected.`),
		);
		client.lavalink.nodeManager.on('disconnect', (node) =>
			console.warn(`[Lavalink] Node "${node.id}" disconnected.`),
		);
		client.lavalink.nodeManager.on('error', (node, err) =>
			console.error(`[Lavalink] Node "${node.id}" error:`, err.message),
		);

		// --- Autoplay state (per-guild Set, resets on restart) ---
		client.autoplayGuilds = new Set();

		// --- Player events (required for audio to work + autoSkip) ---
		client.lavalink.on('trackStart', (player, track) => {
			const channel = client.channels.cache.get(player.textChannelId);
			channel?.send(`🎵 Now playing: **${track.info.title}** by **${track.info.author}**`).catch(() => {});
		});

		client.lavalink.on('trackEnd', (player, track) => {
			console.log(`[Lavalink] Track ended: ${track.info.title}`);
		});

		client.lavalink.on('trackError', (player, track, payload) => {
			console.error(`[Lavalink] Track error for "${track.info.title}":`, payload.exception?.message);
			const channel = client.channels.cache.get(player.textChannelId);
			channel?.send(`❌ Error playing **${track.info.title}** — skipping.`).catch(() => {});
		});

		client.lavalink.on('trackStuck', (player, track) => {
			console.warn(`[Lavalink] Track stuck: ${track.info.title}`);
			const channel = client.channels.cache.get(player.textChannelId);
			channel?.send(`⚠️ Track got stuck — skipping **${track.info.title}**.`).catch(() => {});
		});

		client.lavalink.on('queueEnd', async (player) => {
			const channel = client.channels.cache.get(player.textChannelId);

			// If autoplay is on for this guild, queue a random song automatically
			if (client.autoplayGuilds.has(player.guildId)) {
				const SONG_POOL = require('../data/songPool.js');
				const query = SONG_POOL[Math.floor(Math.random() * SONG_POOL.length)];

				try {
					const result = await player.search({ query, source: 'scsearch' }, client.user);

					if (result?.tracks?.length) {
						// Add the random track and start playing — trackStart will announce it
						player.queue.add(result.tracks[0]);
						await player.play({ clientTrack: player.queue.current ?? player.queue.tracks[0] });
					} else {
						channel?.send('🔁 Autoplay couldn\'t find a song — queue ended. Use `/play` to add more.').catch(() => {});
					}
				} catch (err) {
					console.error('[Autoplay] Error picking random track:', err.message);
					channel?.send('🔁 Autoplay hit an error — queue ended.').catch(() => {});
				}
			} else {
				channel?.send('✅ Queue finished. Use `/play` to add more songs.').catch(() => {});
			}
		});

		await client.lavalink.init({ id: process.env.CLIENT_ID, username: client.user.username });
		console.log('[Lavalink] Client initialised.');

		// --- Giveaways manager ---
		client.giveawaysManager = new GiveawaysManager(client, {
			storage: './data/giveaways.json',
			default: {
				botsCanWin: false,
				embedColor: '#5865F2',
				embedColorEnd: '#2C2F33',
				reaction: '🥳',
			},
		});
		console.log('[Giveaways] Manager initialised.');

		// --- Nitrado pinned embed cron (every minute) ---
		cron.schedule('0 * * * * *', async () => {
			const scheduled = await db.ServerInfoCron.findAll({
				attributes: ['messageId', 'channelId', 'servername'],
			});
			for (const entry of scheduled) {
				try {
					const channel = await client.channels.fetch(entry.channelId);
					const message = await channel.messages.fetch(entry.messageId);
					await messageUpdater.execute(message, entry.servername);
				} catch (err) {
					console.error(`[Nitrado Cron] Failed to update "${entry.servername}":`, err.message);
				}
			}
		});

		// --- DayZ server embed watcher ---
		await startDayzWatcher(client);

		console.log(`[BOT] Ready — logged in as ${client.user.tag}`);

		// --- Auto-deploy slash commands (runs in background, won't block ready) ---
		deployCommands(client).catch(err =>
			console.error('[Commands] Auto-deploy failed:', err.message),
		);
	},
};

// Deploys all slash commands using axios (bypasses undici which hangs on this system).
// Skips deployment if commands haven't changed since last successful deploy.
async function deployCommands(client) {
	const axios = require('axios');
	const crypto = require('crypto');
	const PRIVATE_NAMES = ['hiddenmsg'];
	const HASH_FILE = path.join(__dirname, '../data/commands.hash');
	const commands = [];
	const privateCommands = [];

	function collectFiles(dir) {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				collectFiles(full);
			} else if (entry.name.endsWith('.js')) {
				const cmd = require(full);
				if (!cmd?.data?.toJSON || !cmd.execute) continue; // skip bad file, don't exit
				if (PRIVATE_NAMES.includes(cmd.data.name)) privateCommands.push(cmd.data.toJSON());
				else commands.push(cmd.data.toJSON());
			}
		}
	}
	collectFiles(path.join(__dirname, '../commands'));

	// Hash the current command list — skip deploy if nothing changed since last run
	const currentHash = crypto
		.createHash('md5')
		.update(JSON.stringify(commands) + JSON.stringify(privateCommands))
		.digest('hex');

	const dataDir = path.join(__dirname, '../data');
	if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

	const savedHash = fs.existsSync(HASH_FILE) ? fs.readFileSync(HASH_FILE, 'utf8').trim() : '';

	if (currentHash === savedHash) {
		console.log('[Commands] No changes detected — skipping deploy.');
		return;
	}

	const headers = {
		Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
		'Content-Type': 'application/json',
	};
	const baseUrl = 'https://discord.com/api/v10';

	const guildIds = process.env.GUILD_IDS
		? process.env.GUILD_IDS.split(',').map(id => id.trim()).filter(Boolean)
		: [];

	// Clear any old global commands so they don't duplicate guild ones
	try {
		await axios.put(`${baseUrl}/applications/${process.env.CLIENT_ID}/commands`, [], { headers, timeout: 20_000 });
		console.log('[Commands] Cleared old global commands.');
	} catch { /* ignore — not critical */ }

	for (const guildId of guildIds) {
		// If this guild is also the private guild, include private commands in the same PUT
		// (two PUTs to the same guild would overwrite each other)
		const payload = guildId === process.env.PRIVATE_GUILD_ID
			? [...commands, ...privateCommands]
			: commands;
		await putWithRetry(axios, `${baseUrl}/applications/${process.env.CLIENT_ID}/guilds/${guildId}/commands`, payload, headers);
		console.log(`[Commands] Registered ${payload.length} commands in guild ${guildId}`);
	}

	// Only do a separate private PUT if PRIVATE_GUILD_ID is a different guild from all GUILD_IDS
	if (privateCommands.length && process.env.PRIVATE_GUILD_ID && !guildIds.includes(process.env.PRIVATE_GUILD_ID)) {
		await putWithRetry(axios, `${baseUrl}/applications/${process.env.CLIENT_ID}/guilds/${process.env.PRIVATE_GUILD_ID}/commands`, privateCommands, headers);
		console.log(`[Commands] Registered ${privateCommands.length} private commands in private guild`);
	}

	// Save hash so next restart skips deploy
	fs.writeFileSync(HASH_FILE, currentHash, 'utf8');
	console.log('[Commands] Hash saved — future restarts will skip deploy unless commands change.');
}

// Retries a PUT on 429, waiting the retry-after duration Discord specifies
async function putWithRetry(axios, url, body, headers) {
	while (true) {
		try {
			await axios.put(url, body, { headers, timeout: 20_000 });
			return;
		} catch (err) {
			if (err.response?.status === 429) {
				const retryAfter = (err.response.data?.retry_after ?? 10) * 1000;
				console.warn(`[Commands] Rate limited — retrying in ${Math.ceil(retryAfter / 1000)}s...`);
				await new Promise(r => setTimeout(r, retryAfter));
			} else {
				throw err;
			}
		}
	}
}
