// =============================================
// Command: /autoplay
// Toggles autoplay on/off for this guild
// When on: bot queues a random song when the queue runs out
// State is in-memory only — resets on bot restart
// =============================================

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('autoplay')
		.setDescription('Toggle autoplay — keeps music going when the queue runs out.'),

	async execute(interaction) {
		const guilds = interaction.client.autoplayGuilds;
		const guildId = interaction.guildId;

		if (guilds.has(guildId)) {
			// Turn off
			guilds.delete(guildId);
			await interaction.reply('🔁 Autoplay **disabled** — queue will stop when empty.');
		} else {
			// Turn on
			guilds.add(guildId);
			await interaction.reply('🔁 Autoplay **enabled** — I\'ll keep playing random songs when the queue runs out.');
		}
	},
};
