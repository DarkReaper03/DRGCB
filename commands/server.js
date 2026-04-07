// =============================================
// Command: /server
// Nitrado game server management — import, info,
// start, stop, restart, switch game, list, delete,
// pin/unpin auto-updating status embeds
// (Merged from DC Nitradis + DC Tism Land)
// =============================================

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { request } = require('undici');
const db = require('../database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setDescription('Control a Nitrado game server or display info.')
		.addSubcommand(sub =>
			sub.setName('import')
				.setDescription('Add a Nitrado server to the database.')
				.addIntegerOption(o => o.setName('serverid').setDescription('Nitrado Server ID.').setRequired(true))
				.addStringOption(o => o.setName('server-name').setDescription('Display name (max 25 chars).').setRequired(true).setMaxLength(25).setMinLength(3))
				.addStringOption(o => o.setName('nitrado-token').setDescription('Nitrado API token.').setRequired(true).setMaxLength(100).setMinLength(100)),
		)
		.addSubcommand(sub =>
			sub.setName('delete')
				.setDescription('Remove a server from the database.')
				.addStringOption(o => o.setName('server-name').setDescription('Server to delete.').setRequired(true).setAutocomplete(true)),
		)
		.addSubcommand(sub =>
			sub.setName('list')
				.setDescription('List all servers in the database.'),
		)
		.addSubcommand(sub =>
			sub.setName('info')
				.setDescription('Show server status.')
				.addStringOption(o => o.setName('server-name').setDescription('Server to query.').setRequired(true).setAutocomplete(true))
				.addBooleanOption(o => o.setName('pin-message').setDescription('Pin and auto-update this message every minute?').setRequired(false)),
		)
		.addSubcommand(sub =>
			sub.setName('start')
				.setDescription('Start a server.')
				.addStringOption(o => o.setName('server-name').setDescription('Server to start.').setRequired(true).setAutocomplete(true)),
		)
		.addSubcommand(sub =>
			sub.setName('stop')
				.setDescription('Stop a server.')
				.addStringOption(o => o.setName('server-name').setDescription('Server to stop.').setRequired(true).setAutocomplete(true)),
		)
		.addSubcommand(sub =>
			sub.setName('restart')
				.setDescription('Restart a server.')
				.addStringOption(o => o.setName('server-name').setDescription('Server to restart.').setRequired(true).setAutocomplete(true)),
		)
		.addSubcommand(sub =>
			sub.setName('switch')
				.setDescription('Switch active game on a server.')
				.addStringOption(o => o.setName('server-name').setDescription('Server to switch.').setRequired(true).setAutocomplete(true))
				.addStringOption(o => o.setName('game').setDescription('Game to switch to.').setRequired(true).setAutocomplete(true)),
		)
		.addSubcommand(sub =>
			sub.setName('unpin')
				.setDescription('Stop auto-updating and unpin a server info message.')
				.addStringOption(o => o.setName('server-name').setDescription('Server to unpin.').setRequired(true).setAutocomplete(true)),
		),

	// Autocomplete: server-name and game fields
	async autocomplete(interaction) {
		const focused = interaction.options.getFocused(true);

		if (focused.name === 'server-name') {
			const list = await db.Server.findAll({ attributes: ['displayname'] });
			const choices = list.map(s => s.displayname).filter(n => n.startsWith(focused.value));
			return interaction.respond(choices.map(c => ({ name: c, value: c })));
		}

		if (focused.name === 'game') {
			const serverName = interaction.options.getString('server-name');
			const entry = await db.Server.findOne({ where: { displayname: serverName }, attributes: ['installedGames'] });
			const choices = (entry?.installedGames || '').split(', ').filter(g => g.startsWith(focused.value));
			return interaction.respond(choices.map(c => ({ name: c, value: c })));
		}
	},

	async execute(interaction) {
		const sub = interaction.options.getSubcommand();

		// --- import ---
		if (sub === 'import') {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const id = interaction.options.getInteger('serverid');
			const name = interaction.options.getString('server-name');
			const token = interaction.options.getString('nitrado-token');

			try {
				const server = await db.Server.create({ id, displayname: name, nitradotoken: token });
				return interaction.editReply(`Server **${server.displayname}** (#${server.id}) added.`);
			} catch (err) {
				if (err.name === 'SequelizeUniqueConstraintError') return interaction.editReply('That server already exists.');
				return interaction.editReply(`Error: ${err.name}: ${err.message}`);
			}
		}

		// --- delete ---
		if (sub === 'delete') {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const name = interaction.options.getString('server-name');
			try {
				await db.Server.destroy({ where: { displayname: name } });
				return interaction.editReply(`Server **"${name}"** removed from database.`);
			} catch (err) {
				return interaction.editReply(`Error: ${err.name}: ${err.message}`);
			}
		}

		// --- list ---
		if (sub === 'list') {
			await interaction.deferReply();
			const list = await db.Server.findAll({ attributes: ['displayname'] });
			const text = list.map(s => s.displayname).join('\n') || 'No servers in database.';
			return interaction.editReply(`**Servers:**\n${text}`);
		}

		// --- info ---
		if (sub === 'info') {
			await interaction.deferReply();
			const name = interaction.options.getString('server-name');
			const pin = interaction.options.getBoolean('pin-message') ?? false;

			const serverData = await db.Server.findOne({ where: { displayname: name } });
			if (!serverData) return interaction.editReply(`Server **"${name}"** not found.`);

			const embed = await buildServerEmbed(serverData, name);
			if (!embed) return interaction.editReply('Failed to fetch server info from Nitrado API.');

			if (pin) embed.setFooter({ text: 'This message auto-updates every minute.' });

			const message = await interaction.editReply({ embeds: [embed] });

			if (pin) {
				try {
					await db.ServerInfoCron.create({ messageId: message.id, channelId: interaction.channelId, servername: name });
					await message.pin();
				} catch (err) {
					if (err.name === 'SequelizeUniqueConstraintError') return interaction.editReply('That server already has a pinned message scheduled.');
					return interaction.editReply(`Error scheduling: ${err.message}`);
				}
			}
		}

		// --- start / stop / restart ---
		if (['start', 'stop', 'restart'].includes(sub)) {
			await interaction.deferReply();
			const name = interaction.options.getString('server-name');
			const serverData = await db.Server.findOne({ where: { displayname: name } });
			if (!serverData) return interaction.editReply(`Server **"${name}"** not found.`);

			const endpoint = sub === 'start' ? 'restart' : sub; // Nitrado uses /restart for start too
			const msg = `${sub} via UnifiedBot from ${interaction.guild.name} by ${interaction.user.username}`;
			const query = new URLSearchParams({ message: msg });

			const res = await request(
				`https://api.nitrado.net/services/${serverData.id}/gameservers/${endpoint}?${query}`,
				{ headers: { authorization: serverData.nitradotoken }, method: 'POST' },
			);
			const json = await res.body.json();

			if (json.status === 'success') return interaction.editReply(`**"${name}"** is now ${sub}ing.`);
			return interaction.editReply(`Nitrado API error: ${json.message}`);
		}

		// --- switch ---
		if (sub === 'switch') {
			await interaction.deferReply();
			const name = interaction.options.getString('server-name');
			const game = interaction.options.getString('game');
			const serverData = await db.Server.findOne({ where: { displayname: name } });
			if (!serverData) return interaction.editReply(`Server **"${name}"** not found.`);

			// Get games list to resolve folder_short
			const gamesRes = await request(
				`https://api.nitrado.net/services/${serverData.id}/gameservers/games`,
				{ headers: { authorization: serverData.nitradotoken } },
			);
			const gamesJson = await gamesRes.body.json();
			if (gamesJson.status !== 'success') return interaction.editReply(`Nitrado API error: ${gamesJson.message}`);

			const selected = gamesJson.data.games.find(g => g.name === game);
			if (!selected) return interaction.editReply(`Game **"${game}"** not found on this server.`);

			const query = new URLSearchParams({ game: selected.folder_short });
			const res = await request(
				`https://api.nitrado.net/services/${serverData.id}/gameservers/games/start?${query}`,
				{ headers: { authorization: serverData.nitradotoken }, method: 'POST' },
			);
			const json = await res.body.json();

			if (json.status === 'success') return interaction.editReply(`**"${name}"** is switching to **${game}**.`);
			return interaction.editReply(`Nitrado API error: ${json.message}`);
		}

		// --- unpin ---
		if (sub === 'unpin') {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const name = interaction.options.getString('server-name');
			const entry = await db.ServerInfoCron.findOne({ where: { servername: name } });
			if (!entry) return interaction.editReply(`No pinned message found for **"${name}"**.`);

			try {
				const channel = await interaction.client.channels.fetch(entry.channelId);
				const message = await channel.messages.fetch(entry.messageId);
				await message.unpin();
				await db.ServerInfoCron.destroy({ where: { servername: name } });
				return interaction.editReply(`Unpinned and removed auto-update for **"${name}"**.`);
			} catch (err) {
				return interaction.editReply(`Failed to unpin: ${err.message}`);
			}
		}
	},
};

// =============================================
// Helper: fetch server info and build embed
// =============================================
async function buildServerEmbed(serverData, displayName) {
	try {
		const infoRes = await request(
			`https://api.nitrado.net/services/${serverData.id}/gameservers`,
			{ headers: { authorization: serverData.nitradotoken } },
		);
		const info = await infoRes.body.json();
		if (info.status !== 'success') return null;

		const gamesRes = await request(
			`https://api.nitrado.net/services/${serverData.id}/gameservers/games`,
			{ headers: { authorization: serverData.nitradotoken } },
		);
		const games = await gamesRes.body.json();
		if (games.status !== 'success') return null;

		const { gameserver: { status, ip, port, query_port, game, game_human } } = info.data;
		const gameList = games.data.games;
		const [activeGame] = gameList.filter(g => g.active);
		const installedGames = gameList.filter(g => g.installed).map(g => g.name);

		// Status icon and colour
		const statusMap = {
			started:        { icon: '🟢', color: 0x00B000 },
			stopped:        { icon: '🔴', color: 0xF00000 },
			restarting:     { icon: '🟡', color: 0xFFEA00 },
			stopping:       { icon: '🟠', color: 0xFFEA00 },
			gs_installation:{ icon: '🟣', color: 0x8D65C5 },
		};
		const { icon = '⚪', color = 0xA8A8A8 } = statusMap[status] ?? {};

		const embed = new EmbedBuilder()
			.setTitle(displayName)
			.setDescription(`${icon} ${game_human}`)
			.setColor(color)
			.setThumbnail(activeGame?.icons?.x256 ?? null)
			.addFields(
				{ name: 'IP Address', value: `${ip}`, inline: true },
				{ name: 'Game Port', value: `${port}`, inline: true },
				{ name: 'Query Port', value: `${query_port}`, inline: true },
			)
			.setTimestamp();

		// Valheim live player count
		if (game === 'valheim' && status === 'started') {
			const { query } = info.data.gameserver;
			embed.addFields(
				{ name: 'Server Name', value: query.server_name, inline: true },
				{ name: 'Players Online', value: `${query.player_current}`, inline: true },
			);
		}

		embed.addFields({ name: 'Installed Games', value: installedGames.join(', ') || 'None' });

		// Cache installed games + active game in DB
		await db.Server.update(
			{ installedGames: installedGames.join(', '), activeGame: game_human },
			{ where: { id: serverData.id } },
		);

		return embed;
	} catch (err) {
		console.error('[server.js] buildServerEmbed error:', err);
		return null;
	}
}

module.exports.buildServerEmbed = buildServerEmbed;
