// =============================================
// Command: /roulette
// Bet on a color (red/black) or a number (0-36)
// =============================================

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');

// Standard European roulette — red numbers
const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

async function getUser(userId, guildId) {
	const [user] = await db.User.findOrCreate({
		where: { userId, guildId },
		defaults: { wallet: 0, bank: 0 },
	});
	return user;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('roulette')
		.setDescription('Spin the roulette wheel.')
		.addIntegerOption(opt =>
			opt.setName('bet').setDescription('Amount to bet').setMinValue(10).setRequired(true),
		)
		.addStringOption(opt =>
			opt.setName('choice')
				.setDescription('What to bet on: red, black, or a number (0-36)')
				.setRequired(true),
		),

	async execute(interaction) {
		const bet = interaction.options.getInteger('bet');
		const raw = interaction.options.getString('choice').toLowerCase().trim();
		const user = await getUser(interaction.user.id, interaction.guildId);

		if (user.wallet < bet) {
			return interaction.reply({
				content: `You only have **${user.wallet}** coins in your wallet.`,
				flags: MessageFlags.Ephemeral,
			});
		}

		// Validate choice
		const isColor = raw === 'red' || raw === 'black';
		const isNumber = /^\d+$/.test(raw) && parseInt(raw) >= 0 && parseInt(raw) <= 36;

		if (!isColor && !isNumber) {
			return interaction.reply({
				content: 'Invalid choice. Use `red`, `black`, or a number between `0` and `36`.',
				flags: MessageFlags.Ephemeral,
			});
		}

		// Spin
		const result = Math.floor(Math.random() * 37); // 0–36
		const resultColor = result === 0 ? 'green' : RED_NUMBERS.has(result) ? 'red' : 'black';
		const colorEmoji = { red: '🔴', black: '⚫', green: '🟢' }[resultColor];

		let won = false;
		let payout = 0;
		let multiplier;

		if (isColor) {
			won = raw === resultColor;
			multiplier = 2; // 1:1 payout
			payout = won ? bet * multiplier : -bet;
		} else {
			const chosen = parseInt(raw);
			won = chosen === result;
			multiplier = 36; // 35:1 payout
			payout = won ? bet * multiplier : -bet;
		}

		await user.update({ wallet: user.wallet + payout });

		const embed = new EmbedBuilder()
			.setTitle('🎡 Roulette')
			.setColor(won ? 0x2ECC71 : 0xE74C3C)
			.setDescription(
				`The wheel landed on **${result} ${colorEmoji}**.\n\n` +
				(won
					? `🎉 You won **${Math.abs(payout).toLocaleString()} coins**!`
					: `😞 You lost **${bet.toLocaleString()} coins**.`),
			)
			.addFields(
				{ name: 'Your Bet', value: `${bet.toLocaleString()} coins on **${raw}**`, inline: true },
				{ name: 'New Balance', value: `${(user.wallet + payout).toLocaleString()} coins`, inline: true },
			)
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};
