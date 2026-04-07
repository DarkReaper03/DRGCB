// =============================================
// Command: /bot
// Subcommands:
//   ping    — anyone can check latency
//   restart — OWNER ONLY, kills process for PM2 to restart
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bot')
		.setDescription('Bot management commands.')
		.addSubcommand(sub =>
			sub.setName('ping')
				.setDescription('Shows bot and WebSocket latency.'),
		)
		.addSubcommand(sub =>
			sub.setName('restart')
				.setDescription('Kills the bot process — PM2 will restart it. (Owner only)'),
		),

	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'ping') {
			const sent = await interaction.deferReply({ flags: MessageFlags.Ephemeral, fetchReply: true });
			await interaction.editReply(
				`Roundtrip: **${sent.createdTimestamp - interaction.createdTimestamp}ms** | WebSocket heartbeat: **${interaction.client.ws.ping}ms**`,
			);
		}

		else if (interaction.options.getSubcommand() === 'restart') {
			// Owner-only check
			if (interaction.user.id !== process.env.OWNER_ID) {
				return interaction.reply({ content: 'Only the bot owner can restart the bot.', flags: MessageFlags.Ephemeral });
			}

			await interaction.reply({ content: 'Restarting...', flags: MessageFlags.Ephemeral });
			console.log(`[BOT] Restart triggered by ${interaction.user.tag}`);
			process.exit();
		}
	},
};
