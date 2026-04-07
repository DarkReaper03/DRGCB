// =============================================
// Command: /help
// Shows all commands organized by category
// Hides owner-only private commands (/hiddenmsg)
// =============================================

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const CATEGORIES = [
	{
		name: '🛠️ Bot',
		commands: [
			{ name: '/bot ping',    desc: 'Check bot and WebSocket latency.' },
			{ name: '/bot restart', desc: 'Restart the bot process (owner only).' },
		],
	},
	{
		name: '👤 General',
		commands: [
			{ name: '/whoami',   desc: 'Your username and server join date.' },
			{ name: '/whereami', desc: 'Current server name and member count.' },
			{ name: '/waifu',    desc: 'Random waifu image (optional NSFW).' },
		],
	},
	{
		name: '🎉 Fun',
		commands: [
			{ name: '/cat',    desc: 'Random cat picture.' },
			{ name: '/dog',    desc: 'Random dog picture.' },
			{ name: '/meme',   desc: 'Random meme from Reddit.' },
			{ name: '/joke',   desc: 'Random joke.' },
			{ name: '/8ball',  desc: 'Ask the magic 8-ball a question.' },
			{ name: '/flip',   desc: 'Flip a coin.' },
			{ name: '/dice',   desc: 'Roll a dice (1-6 by default).' },
			{ name: '/rps',    desc: 'Rock paper scissors.' },
			{ name: '/trivia', desc: 'Answer a random trivia question.' },
		],
	},
	{
		name: '🔧 Utility',
		commands: [
			{ name: '/weather',     desc: 'Current weather for a city.' },
			{ name: '/youtube',     desc: 'Search YouTube for a video.' },
			{ name: '/google',      desc: 'Search Google.' },
			{ name: '/translate',   desc: 'Translate text to another language.' },
			{ name: '/userinfo',    desc: 'Info about a user.' },
			{ name: '/roleinfo',    desc: 'Info about a role.' },
			{ name: '/channelinfo', desc: 'Info about a channel.' },
			{ name: '/calculator',  desc: 'Evaluate a math expression.' },
		],
	},
	{
		name: '🛡️ Moderation',
		commands: [
			{ name: '/ban',           desc: 'Ban a member.' },
			{ name: '/kick',          desc: 'Kick a member.' },
			{ name: '/unban',         desc: 'Unban a user by ID.' },
			{ name: '/warn',          desc: 'Warn a member.' },
			{ name: '/warnings',      desc: 'View all warnings for a user.' },
			{ name: '/clearwarnings', desc: 'Clear all warnings for a user.' },
			{ name: '/disconnect',    desc: 'Disconnect a user from voice.' },
			{ name: '/linkwatcher get-settings',       desc: 'Show phishing watcher config.' },
			{ name: '/linkwatcher set-action',         desc: 'Set phishing action (kick/ban/none).' },
			{ name: '/linkwatcher set-max-warnings',   desc: 'Set warn limit before action.' },
			{ name: '/linkwatcher set-notify-channel', desc: 'Set logging channel for phishing.' },
		],
	},
	{
		name: '💰 Economy',
		commands: [
			{ name: '/balance',   desc: 'Check wallet and bank balance.' },
			{ name: '/daily',     desc: 'Claim daily coins (24h cooldown).' },
			{ name: '/work',      desc: 'Work for coins (1h cooldown).' },
			{ name: '/beg',       desc: 'Beg for a small coin payout (30s cooldown).' },
			{ name: '/transfer',  desc: 'Send coins from your wallet to another user.' },
			{ name: '/slots',     desc: 'Spin the slot machine.' },
			{ name: '/blackjack', desc: 'Play blackjack against the dealer.' },
			{ name: '/roulette',  desc: 'Bet on a color or number (roulette).' },
		],
	},
	{
		name: '📈 Levels',
		commands: [
			{ name: '/rank',        desc: 'View your XP rank card.' },
			{ name: '/leaderboard', desc: 'Top 10 XP leaderboard for this server.' },
		],
	},
	{
		name: '🎁 Giveaways',
		commands: [
			{ name: '/giveaway start',  desc: 'Start a new giveaway.' },
			{ name: '/giveaway end',    desc: 'End a giveaway early.' },
			{ name: '/giveaway reroll', desc: 'Reroll winners for an ended giveaway.' },
		],
	},
	{
		name: '🎫 Tickets',
		commands: [
			{ name: '/ticket setup', desc: 'Post the support ticket panel. (Manage Channels)' },
			{ name: '/ticket open',  desc: 'Open a support ticket.' },
		],
	},
	{
		name: '🎵 Music',
		commands: [
			{ name: '/play',       desc: 'Play a song or playlist (name or URL).' },
			{ name: '/stop',       desc: 'Stop music and leave the voice channel.' },
			{ name: '/pause',      desc: 'Pause the current track.' },
			{ name: '/resume',     desc: 'Resume a paused track.' },
			{ name: '/skip',       desc: 'Skip the current track.' },
			{ name: '/queue',      desc: 'View the music queue.' },
			{ name: '/nowplaying', desc: 'Show what is currently playing.' },
			{ name: '/volume',     desc: 'Set or view the playback volume.' },
			{ name: '/shuffle',    desc: 'Shuffle the queue.' },
			{ name: '/loop',       desc: 'Cycle loop mode (off → track → queue).' },
		],
	},
	{
		name: '🗺️ DayZ Watcher',
		commands: [
			{ name: '/dayz add',     desc: 'Watch a DayZ server. (Owner only)' },
			{ name: '/dayz remove',  desc: 'Remove a watched server. (Owner only)' },
			{ name: '/dayz list',    desc: 'List all watched servers.' },
			{ name: '/dayz refresh', desc: 'Force-update a server embed. (Owner only)' },
		],
	},
	{
		name: '🎮 Nitrado Servers',
		commands: [
			{ name: '/server import',  desc: 'Add a Nitrado server to the database.' },
			{ name: '/server delete',  desc: 'Remove a server from the database.' },
			{ name: '/server list',    desc: 'List all servers.' },
			{ name: '/server info',    desc: 'Show live server status (optional pin).' },
			{ name: '/server start',   desc: 'Start a server.' },
			{ name: '/server stop',    desc: 'Stop a server.' },
			{ name: '/server restart', desc: 'Restart a server.' },
			{ name: '/server switch',  desc: 'Switch the active game on a server.' },
			{ name: '/server unpin',   desc: 'Stop auto-updating a pinned status.' },
		],
	},
];

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Shows all available commands organized by category.'),

	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const embed = new EmbedBuilder()
			.setTitle('Command Reference')
			.setColor(0x5865F2)
			.setTimestamp()
			.setFooter({ text: 'Unified Bot' });

		for (const category of CATEGORIES) {
			const lines = category.commands.map(c => `\`${c.name}\` — ${c.desc}`).join('\n');
			embed.addFields({ name: category.name, value: lines, inline: false });
		}

		await interaction.editReply({ embeds: [embed] });
	},
};
