// =============================================
// Command: /play
// Supports: Spotify URLs, YouTube URLs, plain search
// Requires: LavaSrc + youtube-source plugins on Lavalink
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

// Detect URL type so we use the right search source
function resolveSource(query) {
	if (/open\.spotify\.com\/(track|album|playlist|artist)/i.test(query)) {
		// Direct Spotify URL — LavaSrc handles it natively, no prefix needed
		return { query, source: 'spotify' };
	}
	if (/youtube\.com|youtu\.be|music\.youtube\.com/i.test(query)) {
		// Direct YouTube or YouTube Music URL — normalise music.youtube.com to regular domain
		const normalised = query.replace('music.youtube.com', 'www.youtube.com');
		return { query: normalised, source: 'youtube' };
	}
	// Plain text — default to YouTube search
	return { query, source: 'ytsearch' };
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play a song or playlist from YouTube or Spotify.')
		.addStringOption(opt =>
			opt.setName('query')
				.setDescription('Song name, YouTube URL, or Spotify link')
				.setRequired(true),
		)
		.addStringOption(opt =>
			opt.setName('source')
				.setDescription('Where to search (default: YouTube)')
				.setRequired(false)
				.addChoices(
					{ name: 'YouTube', value: 'ytsearch' },
					{ name: 'Spotify', value: 'spsearch' },
				),
		),

	async execute(interaction) {
		const rawQuery = interaction.options.getString('query');
		const forcedSource = interaction.options.getString('source');
		const member = interaction.member;
		const vc = member.voice?.channel;

		if (!vc) {
			return interaction.reply({ content: 'You need to be in a voice channel.', flags: MessageFlags.Ephemeral });
		}

		await interaction.deferReply();

		const lavalink = interaction.client.lavalink;

		// Create or get the player for this guild
		let player = lavalink.getPlayer(interaction.guildId);
		if (!player) {
			player = lavalink.createPlayer({
				guildId: interaction.guildId,
				voiceChannelId: vc.id,
				textChannelId: interaction.channelId,
				selfDeaf: true,
				selfMute: false,
			});
		}

		// Connect to VC if not already
		if (!player.connected) await player.connect();

		// Resolve the search source — URL detection takes priority over the option
		const { query, source } = forcedSource
			? { query: rawQuery, source: forcedSource }
			: resolveSource(rawQuery);

		// Search via Lavalink (search is on the player in lavalink-client v2)
		const result = await player.search({ query, source }, interaction.user);

		if (!result || !result.tracks?.length) {
			return interaction.editReply('No results found. Check the link or try a different search.');
		}

		const wasIdle = !player.playing && !player.paused;

		if (result.loadType === 'playlist') {
			// Add entire playlist/album
			player.queue.add(result.tracks);
			await interaction.editReply(
				`📋 Added playlist **${result.playlist?.name ?? 'Unknown'}** (${result.tracks.length} tracks) to the queue.`,
			);
		} else {
			// Add single track
			const track = result.tracks[0];
			player.queue.add(track);
			await interaction.editReply(
				wasIdle
					? `🎵 Loading **${track.info.title}**...`
					: `➕ Added **${track.info.title}** to the queue.`,
			);
		}

		// Start playing — pass the track explicitly on first play
		if (wasIdle) await player.play({ clientTrack: player.queue.current ?? player.queue.tracks[0] });
	},
};
