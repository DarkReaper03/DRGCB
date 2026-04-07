// =============================================
// Command: /pause
// Pause the current track
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pause')
		.setDescription('Pause the current track.'),

	async execute(interaction) {
		const player = interaction.client.lavalink.getPlayer(interaction.guildId);

		if (!player?.playing) {
			return interaction.reply({ content: 'Nothing is currently playing.', flags: MessageFlags.Ephemeral });
		}
		if (player.paused) {
			return interaction.reply({ content: 'Already paused. Use `/resume` to continue.', flags: MessageFlags.Ephemeral });
		}

		await player.pause();
		await interaction.reply('⏸ Paused.');
	},
};
