// =============================================
// Command: /slots
// Slot machine — bet coins from your wallet
// =============================================

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🍀', '💎', '7️⃣'];
const PAYOUTS = { '7️⃣': 10, '💎': 7, '🍀': 5, '🍇': 4, '🍊': 3, '🍋': 2, '🍒': 1.5 };

async function getUser(userId, guildId) {
	const [user] = await db.User.findOrCreate({
		where: { userId, guildId },
		defaults: { wallet: 0, bank: 0 },
	});
	return user;
}

function spin() {
	// Weighted — rarer symbols appear less often
	const weights = [30, 25, 20, 12, 7, 4, 2]; // indexes match SYMBOLS
	const total = weights.reduce((a, b) => a + b, 0);
	const pick = () => {
		let r = Math.random() * total;
		for (let i = 0; i < weights.length; i++) {
			r -= weights[i];
			if (r <= 0) return SYMBOLS[i];
		}
		return SYMBOLS[0];
	};
	return [pick(), pick(), pick()];
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('slots')
		.setDescription('Spin the slot machine.')
		.addIntegerOption(opt =>
			opt.setName('bet').setDescription('Amount to bet').setMinValue(10).setRequired(true),
		),

	async execute(interaction) {
		const bet = interaction.options.getInteger('bet');
		const user = await getUser(interaction.user.id, interaction.guildId);

		if (user.wallet < bet) {
			return interaction.reply({
				content: `You only have **${user.wallet}** coins in your wallet.`,
				flags: MessageFlags.Ephemeral,
			});
		}

		const [a, b, c] = spin();
		let outcome, delta;

		if (a === b && b === c) {
			// Jackpot — all three match
			const multiplier = PAYOUTS[a] ?? 2;
			delta = Math.floor(bet * multiplier);
			outcome = `🎉 **JACKPOT!** \`${a} ${b} ${c}\` — You won **${delta} coins**!`;
		} else if (a === b || b === c || a === c) {
			// Two match — small win
			delta = Math.floor(bet * 0.5);
			outcome = `🎲 Two of a kind! \`${a} ${b} ${c}\` — You won **${delta} coins**.`;
		} else {
			// No match — lose the bet
			delta = -bet;
			outcome = `😬 No match. \`${a} ${b} ${c}\` — You lost **${bet} coins**.`;
		}

		await user.update({ wallet: user.wallet + delta });

		const embed = new EmbedBuilder()
			.setTitle('🎰 Slot Machine')
			.setColor(delta > 0 ? 0x2ECC71 : 0xE74C3C)
			.setDescription(outcome)
			.addFields({ name: 'New Balance', value: `${(user.wallet + delta).toLocaleString()} coins`, inline: true })
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};
