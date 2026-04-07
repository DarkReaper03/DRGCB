// =============================================
// Command: /beg
// Beg for coins — small random payout, 30s cooldown
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');

const COOLDOWN_MS = 30_000; // 30 seconds
const MIN = 10;
const MAX = 100;

async function getUser(userId, guildId) {
	const [user] = await db.User.findOrCreate({
		where: { userId, guildId },
		defaults: { wallet: 0, bank: 0 },
	});
	return user;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('beg')
		.setDescription('Beg for a small amount of coins. (30s cooldown)'),

	async execute(interaction) {
		const user = await getUser(interaction.user.id, interaction.guildId);

		// Check cooldown using lastBeg field
		if (user.lastBeg) {
			const elapsed = Date.now() - new Date(user.lastBeg).getTime();
			if (elapsed < COOLDOWN_MS) {
				const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
				return interaction.reply({
					content: `You're already begging — try again in **${remaining}s**.`,
					flags: MessageFlags.Ephemeral,
				});
			}
		}

		const amount = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
		await user.update({ wallet: user.wallet + amount, lastBeg: new Date() });

		const responses = [
			`Someone felt generous and gave you **${amount}** coins.`,
			`A stranger tossed you **${amount}** coins.`,
			`You held out your hat and collected **${amount}** coins.`,
			`Someone dropped **${amount}** coins in your cup.`,
		];

		await interaction.reply(responses[Math.floor(Math.random() * responses.length)]);
	},
};
