// =============================================
// Command: /volume
// Set or view the player volume (0-100)
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('volume')
		.setDescription('Set the music volume.')
		.addIntegerOption(opt =>
			opt.setName('level').setDescription('Volume 0-100 (omit to see current)').setMinValue(0).setMaxValue(100).setRequired(false),
		),

	async execute(interaction) {
		const player = interaction.client.lavalink.getPlayer(interaction.guildId);

		if (!player) {
			return interaction.reply({ content: 'Nothing is playing.', flags: MessageFlags.Ephemeral });
		}

		const level = interaction.options.getInteger('level');

		if (level === null) {
			return interaction.reply(`🔊 Current volume: **${player.volume}%**`);
		}

		await player.setVolume(level);
		await interaction.reply(`🔊 Volume set to **${level}%**.`);
	},
};
