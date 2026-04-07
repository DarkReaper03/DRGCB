// =============================================
// Command: /work
// Work for coins — medium payout, 1h cooldown
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');

const COOLDOWN_MS = 3_600_000; // 1 hour
const MIN = 150;
const MAX = 400;

const JOBS = [
	'You mined some crypto and earned',
	'You drove for DoorDash and made',
	'You worked a shift at the store and pocketed',
	'You did some freelance work and invoiced',
	'You found a bug bounty worth',
	'You sold some loot in a game for',
	'You walked some dogs and collected',
];

async function getUser(userId, guildId) {
	const [user] = await db.User.findOrCreate({
		where: { userId, guildId },
		defaults: { wallet: 0, bank: 0 },
	});
	return user;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('work')
		.setDescription('Work for coins. (1h cooldown)'),

	async execute(interaction) {
		const user = await getUser(interaction.user.id, interaction.guildId);

		if (user.lastWork) {
			const elapsed = Date.now() - new Date(user.lastWork).getTime();
			if (elapsed < COOLDOWN_MS) {
				const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000 / 60);
				return interaction.reply({
					content: `You're still on break — come back in **${remaining} min**.`,
					flags: MessageFlags.Ephemeral,
				});
			}
		}

		const amount = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
		await user.update({ wallet: user.wallet + amount, lastWork: new Date() });

		const job = JOBS[Math.floor(Math.random() * JOBS.length)];
		await interaction.reply(`💼 ${job} **${amount} coins**.`);
	},
};
