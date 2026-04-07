// =============================================
// Command: /loop
// Cycle loop mode: off → track → queue → off
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

// lavalink-client RepeatMode values
const MODES = {
	off: 'off',
	track: 'track',
	queue: 'queue',
};

const LABELS = {
	off: '🚫 Loop off',
	track: '🔂 Looping current track',
	queue: '🔁 Looping entire queue',
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('loop')
		.setDescription('Change the loop mode (off → track → queue).')
		.addStringOption(opt =>
			opt.setName('mode')
				.setDescription('Loop mode')
				.addChoices(
					{ name: 'Off', value: 'off' },
					{ name: 'Track', value: 'track' },
					{ name: 'Queue', value: 'queue' },
				)
				.setRequired(false),
		),

	async execute(interaction) {
		const player = interaction.client.lavalink.getPlayer(interaction.guildId);

		if (!player) {
			return interaction.reply({ content: 'Nothing is playing.', flags: MessageFlags.Ephemeral });
		}

		const requested = interaction.options.getString('mode');

		let next;
		if (requested) {
			next = MODES[requested];
		} else {
			// Cycle through modes if no option given
			const current = player.repeatMode ?? 'off';
			const cycle = ['off', 'track', 'queue'];
			next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
		}

		await player.setRepeatMode(next);
		await interaction.reply(LABELS[next] ?? `Loop mode: ${next}`);
	},
};
