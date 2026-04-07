// =============================================
// Command: /random
// Picks a random song from the pool and queues it
// Uses SoundCloud directly (bypasses YouTube)
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const SONG_POOL = require('../../data/songPool.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('random')
		.setDescription('Queue a random song.'),

	async execute(interaction) {
		const vc = interaction.member.voice?.channel;

		if (!vc) {
			return interaction.reply({
				content: 'You need to be in a voice channel.',
				flags: MessageFlags.Ephemeral,
			});
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

		// Pick a random song from the pool
		const query = SONG_POOL[Math.floor(Math.random() * SONG_POOL.length)];

		// Search SoundCloud directly
		const result = await player.search({ query, source: 'scsearch' }, interaction.user);

		if (!result?.tracks?.length) {
			return interaction.editReply(`Couldn't find **${query}** on SoundCloud — try again!`);
		}

		const wasIdle = !player.playing && !player.paused;
		const track = result.tracks[0];
		player.queue.add(track);

		await interaction.editReply(
			wasIdle
				? `🎲 Playing random track: **${track.info.title}**`
				: `🎲 Added **${track.info.title}** to the queue.`,
		);

		// Start playing if nothing was running
		if (wasIdle) await player.play({ clientTrack: player.queue.current ?? player.queue.tracks[0] });
	},
};
