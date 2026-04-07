// =============================================
// Command: /queue
// Show the current music queue (paginated, up to 10)
// =============================================

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('View the current music queue.')
		.addIntegerOption(opt =>
			opt.setName('page').setDescription('Page number').setMinValue(1).setRequired(false),
		),

	async execute(interaction) {
		const player = interaction.client.lavalink.getPlayer(interaction.guildId);

		if (!player?.queue?.current) {
			return interaction.reply({ content: 'Nothing is in the queue.', flags: MessageFlags.Ephemeral });
		}

		const tracks = player.queue.tracks;
		const page = (interaction.options.getInteger('page') ?? 1) - 1;
		const pageSize = 10;
		const totalPages = Math.max(1, Math.ceil(tracks.length / pageSize));

		if (page >= totalPages && tracks.length > 0) {
			return interaction.reply({ content: `Only **${totalPages}** page(s) in the queue.`, flags: MessageFlags.Ephemeral });
		}

		const slice = tracks.slice(page * pageSize, page * pageSize + pageSize);
		const lines = slice.map((t, i) =>
			`**${page * pageSize + i + 1}.** [${t.info.title}](${t.info.uri}) — ${formatDuration(t.info.duration)}`,
		);

		const current = player.queue.current;

		const embed = new EmbedBuilder()
			.setTitle('🎵 Music Queue')
			.setColor(0x5865F2)
			.addFields(
				{ name: 'Now Playing', value: `[${current.info.title}](${current.info.uri})`, inline: false },
				{ name: `Up Next (${tracks.length} total)`, value: lines.length ? lines.join('\n') : 'Nothing queued.', inline: false },
			)
			.setFooter({ text: `Page ${page + 1}/${totalPages}` });

		await interaction.reply({ embeds: [embed] });
	},
};

function formatDuration(ms) {
	const s = Math.floor(ms / 1000);
	const m = Math.floor(s / 60);
	const h = Math.floor(m / 60);
	if (h > 0) return `${h}:${pad(m % 60)}:${pad(s % 60)}`;
	return `${m}:${pad(s % 60)}`;
}

function pad(n) { return String(n).padStart(2, '0'); }
