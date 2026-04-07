// =============================================
// Command: /daily
// Claim daily coin reward (once per 24h)
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');

const COOLDOWN_MS = 86_400_000; // 24 hours
const REWARD = 500;

async function getUser(userId, guildId) {
	const [user] = await db.User.findOrCreate({
		where: { userId, guildId },
		defaults: { wallet: 0, bank: 0 },
	});
	return user;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('daily')
		.setDescription('Claim your daily coins. (24h cooldown)'),

	async execute(interaction) {
		const user = await getUser(interaction.user.id, interaction.guildId);

		if (user.lastDaily) {
			const elapsed = Date.now() - new Date(user.lastDaily).getTime();
			if (elapsed < COOLDOWN_MS) {
				const nextClaim = Math.floor((Date.now() + (COOLDOWN_MS - elapsed)) / 1000);
				return interaction.reply({
					content: `You already claimed your daily. Next claim: <t:${nextClaim}:R>`,
					flags: MessageFlags.Ephemeral,
				});
			}
		}

		await user.update({ wallet: user.wallet + REWARD, lastDaily: new Date() });

		await interaction.reply(`💰 You claimed your daily reward of **${REWARD} coins**! Come back tomorrow.`);
	},
};
