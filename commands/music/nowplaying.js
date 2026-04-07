// =============================================
// Command: /nowplaying
// Show details about the currently playing track
// =============================================

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('nowplaying')
		.setDescription('Show what is currently playing.'),

	async execute(interaction) {
		const player = interaction.client.lavalink.getPlayer(interaction.guildId);

		if (!player?.queue?.current) {
			return interaction.reply({ content: 'Nothing is playing right now.', flags: MessageFlags.Ephemeral });
		}

		const track = player.queue.current;
		const info = track.info;
		const position = player.position; // ms elapsed
		const duration = info.duration;

		// Build a simple text progress bar
		const barLength = 20;
		const filled = Math.round((position / duration) * barLength);
		const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

		const embed = new EmbedBuilder()
			.setTitle('🎵 Now Playing')
			.setColor(0x5865F2)
			.setDescription(`**[${info.title}](${info.uri})**`)
			.addFields(
				{ name: 'Author', value: info.author ?? 'Unknown', inline: true },
				{ name: 'Duration', value: `${formatDuration(position)} / ${formatDuration(duration)}`, inline: true },
				{ name: 'Requested by', value: track.requester?.username ?? track.requester?.tag ?? 'Unknown', inline: true },
				{ name: 'Progress', value: `\`[${bar}]\``, inline: false },
			)
			.setThumbnail(info.artworkUrl ?? null)
			.setTimestamp();

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
