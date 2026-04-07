// =============================================
// Module: messageUpdater
// Called by the Nitrado cron in events/ready.js
// every minute to refresh pinned server status embeds.
// (Merged from DC Nitradis + DC Tism Land messageUpdater.js)
// =============================================

const { EmbedBuilder } = require('discord.js');
const { request } = require('undici');
const db = require('../database.js');

module.exports = {
	name: 'messageUpdater',

	async execute(message, serverName) {
		const serverData = await db.Server.findOne({ where: { displayname: serverName } });

		if (!serverData) {
			await message.edit('Error: Server not found in database.').catch(() => {});
			return;
		}

		try {
			// Fetch main server info
			const infoRes = await request(
				`https://api.nitrado.net/services/${serverData.id}/gameservers`,
				{ headers: { authorization: serverData.nitradotoken } },
			);
			const info = await infoRes.body.json();

			if (info.status !== 'success') {
				await message.edit(`Nitrado API error: ${info.status}: ${info.message}`).catch(() => {});
				return;
			}

			// Fetch games list (for thumbnail + installed games)
			const gamesRes = await request(
				`https://api.nitrado.net/services/${serverData.id}/gameservers/games`,
				{ headers: { authorization: serverData.nitradotoken } },
			);
			const gamesJson = await gamesRes.body.json();

			if (gamesJson.status !== 'success') {
				await message.edit(`Nitrado API error: ${gamesJson.status}: ${gamesJson.message}`).catch(() => {});
				return;
			}

			const { gameserver: { status, ip, port, query_port, game, game_human } } = info.data;
			const games = gamesJson.data.games;
			const [activeGame] = games.filter(g => g.active);
			const installedGames = games.filter(g => g.installed).map(g => g.name);

			// Status icon + embed colour
			const statusMap = {
				started:         { icon: '🟢', color: 0x00B000 },
				stopped:         { icon: '🔴', color: 0xF00000 },
				restarting:      { icon: '🟡', color: 0xFFEA00 },
				stopping:        { icon: '🟠', color: 0xFFEA00 },
				gs_installation: { icon: '🟣', color: 0x8D65C5 },
			};
			const { icon = '⚪', color = 0xA8A8A8 } = statusMap[status] ?? {};

			const embed = new EmbedBuilder()
				.setTitle(serverName)
				.setDescription(`${icon} ${game_human}`)
				.setColor(color)
				.setThumbnail(activeGame?.icons?.x256 ?? null)
				.addFields(
					{ name: 'IP Address', value: `${ip}`, inline: true },
					{ name: 'Game Port', value: `${port}`, inline: true },
					{ name: 'Query Port', value: `${query_port}`, inline: true },
				)
				.setTimestamp()
				.setFooter({ text: 'This message auto-updates every minute.' });

			// Valheim: add live player count
			if (game === 'valheim' && status === 'started') {
				const { query } = info.data.gameserver;
				embed.addFields(
					{ name: 'Server Name', value: query.server_name, inline: true },
					{ name: 'Players', value: `${query.player_current}`, inline: true },
				);
			}

			embed.addFields({ name: 'Installed Games', value: installedGames.join(', ') || 'None' });

			// Cache game info in DB
			await db.Server.update(
				{ installedGames: installedGames.join(', '), activeGame: game_human },
				{ where: { id: serverData.id } },
			);

			// Update the pinned message
			await message.edit({ content: '', embeds: [embed] });

			// Re-pin if it got unpinned
			if (!message.pinned && message.pinnable) {
				await message.pin().catch(() => {});
			}

		} catch (err) {
			console.error(`[messageUpdater] Error updating "${serverName}":`, err.message);
			await message.edit(`Update failed: ${err.message}`).catch(() => {});
		}
	},
};
