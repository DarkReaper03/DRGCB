// =============================================
// Command: /leaderboard
// Top 10 users by XP in the current server
// =============================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('View the top 10 users by XP in this server.'),

	async execute(interaction) {
		await interaction.deferReply();

		const topUsers = await db.User.findAll({
			where: { guildId: interaction.guildId },
			order: [['xp', 'DESC']],
			limit: 10,
		});

		if (!topUsers.length) {
			return interaction.editReply('No XP data yet — start chatting to earn XP!');
		}

		const medals = ['🥇', '🥈', '🥉'];
		const lines = [];

		for (let i = 0; i < topUsers.length; i++) {
			const entry = topUsers[i];
			const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
			const tag = user?.username ?? `<@${entry.userId}>`;
			const prefix = medals[i] ?? `**#${i + 1}**`;
			lines.push(`${prefix} ${tag} — Level **${entry.level}** | **${entry.xp.toLocaleString()}** XP`);
		}

		const embed = new EmbedBuilder()
			.setTitle(`🏆 XP Leaderboard — ${interaction.guild.name}`)
			.setColor(0xF1C40F)
			.setDescription(lines.join('\n'))
			.setTimestamp();

		await interaction.editReply({ embeds: [embed] });
	},
};
