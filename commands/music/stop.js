// =============================================
// Command: /stop
// Stop playback, clear queue, leave VC
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stop the music, clear the queue, and leave the voice channel.'),

	async execute(interaction) {
		const player = interaction.client.lavalink.getPlayer(interaction.guildId);

		if (!player) {
			return interaction.reply({ content: 'Nothing is playing.', flags: MessageFlags.Ephemeral });
		}

		await player.destroy();
		await interaction.reply('⏹ Stopped the music and left the voice channel.');
	},
};
