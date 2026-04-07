// =============================================
// Command: /resume
// Resume a paused track
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('resume')
		.setDescription('Resume the paused track.'),

	async execute(interaction) {
		const player = interaction.client.lavalink.getPlayer(interaction.guildId);

		if (!player) {
			return interaction.reply({ content: 'Nothing is playing.', flags: MessageFlags.Ephemeral });
		}
		if (!player.paused) {
			return interaction.reply({ content: 'The player is not paused.', flags: MessageFlags.Ephemeral });
		}

		await player.resume();
		await interaction.reply('▶ Resumed.');
	},
};
