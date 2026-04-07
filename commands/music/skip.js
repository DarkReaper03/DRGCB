// =============================================
// Command: /skip
// Skip the current track
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip the current track.'),

	async execute(interaction) {
		const player = interaction.client.lavalink.getPlayer(interaction.guildId);

		if (!player?.playing) {
			return interaction.reply({ content: 'Nothing is playing.', flags: MessageFlags.Ephemeral });
		}

		const current = player.queue.current;
		await player.skip();
		await interaction.reply(`⏭ Skipped **${current?.info?.title ?? 'the current track'}**.`);
	},
};
