// =============================================
// Command: /shuffle
// Shuffle the upcoming queue
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('shuffle')
		.setDescription('Shuffle the music queue.'),

	async execute(interaction) {
		const player = interaction.client.lavalink.getPlayer(interaction.guildId);

		if (!player?.queue?.tracks?.length) {
			return interaction.reply({ content: 'There are no tracks in the queue to shuffle.', flags: MessageFlags.Ephemeral });
		}

		player.queue.shuffle();
		await interaction.reply(`🔀 Shuffled **${player.queue.tracks.length}** tracks.`);
	},
};
