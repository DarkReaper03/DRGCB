// =============================================
// Command: /blackjack
// Simple text-based blackjack against the dealer
// Uses buttons for hit/stand
// =============================================

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../database.js');

async function getUser(userId, guildId) {
	const [user] = await db.User.findOrCreate({
		where: { userId, guildId },
		defaults: { wallet: 0, bank: 0 },
	});
	return user;
}

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function buildDeck() {
	const deck = [];
	for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
	return deck.sort(() => Math.random() - 0.5);
}

function cardValue(rank) {
	if (['J', 'Q', 'K'].includes(rank)) return 10;
	if (rank === 'A') return 11;
	return parseInt(rank);
}

function handTotal(hand) {
	let total = hand.reduce((s, c) => s + cardValue(c.rank), 0);
	let aces = hand.filter(c => c.rank === 'A').length;
	while (total > 21 && aces > 0) { total -= 10; aces--; }
	return total;
}

function displayHand(hand) {
	return hand.map(c => `${c.rank}${c.suit}`).join('  ');
}

function buildEmbed(playerHand, dealerHand, showDealer, bet, result = null) {
	const playerTotal = handTotal(playerHand);
	const dealerTotal = showDealer ? handTotal(dealerHand) : null;

	const embed = new EmbedBuilder()
		.setTitle('🃏 Blackjack')
		.setColor(result === 'win' ? 0x2ECC71 : result === 'lose' ? 0xE74C3C : result === 'push' ? 0xF1C40F : 0x5865F2)
		.addFields(
			{
				name: `Your Hand (${playerTotal})`,
				value: displayHand(playerHand),
				inline: false,
			},
			{
				name: showDealer ? `Dealer Hand (${dealerTotal})` : 'Dealer Hand',
				value: showDealer ? displayHand(dealerHand) : `${dealerHand[0].rank}${dealerHand[0].suit}  🂠`,
				inline: false,
			},
		)
		.setFooter({ text: `Bet: ${bet} coins` });

	return embed;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('blackjack')
		.setDescription('Play blackjack against the dealer.')
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

		// Deduct bet upfront
		await user.update({ wallet: user.wallet - bet });
		await user.reload();

		// Deal initial hands
		const deck = buildDeck();
		const playerHand = [deck.pop(), deck.pop()];
		const dealerHand = [deck.pop(), deck.pop()];

		// Check for immediate player blackjack
		if (handTotal(playerHand) === 21) {
			const winnings = Math.floor(bet * 1.5);
			await user.update({ wallet: user.wallet + bet + winnings });
			const embed = buildEmbed(playerHand, dealerHand, true, bet, 'win')
				.setDescription(`🎉 **Blackjack!** You won **${winnings} coins**!`);
			return interaction.reply({ embeds: [embed] });
		}

		// Hit/Stand buttons
		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
			new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary),
		);

		const msg = await interaction.reply({
			embeds: [buildEmbed(playerHand, dealerHand, false, bet)],
			components: [row],
			fetchReply: true,
		});

		// Collector — only the command invoker can interact
		const collector = msg.createMessageComponentCollector({
			filter: i => i.user.id === interaction.user.id,
			time: 30_000,
		});

		collector.on('collect', async (btnInt) => {
			if (btnInt.customId === 'bj_hit') {
				playerHand.push(deck.pop());

				if (handTotal(playerHand) > 21) {
					// Bust
					collector.stop('bust');
					const embed = buildEmbed(playerHand, dealerHand, true, bet, 'lose')
						.setDescription(`💥 **Bust!** You went over 21 and lost **${bet} coins**.`);
					return btnInt.update({ embeds: [embed], components: [] });
				}

				if (handTotal(playerHand) === 21) {
					// Auto-stand on 21
					collector.stop('stand');
				} else {
					await btnInt.update({ embeds: [buildEmbed(playerHand, dealerHand, false, bet)], components: [row] });
				}
			}

			if (btnInt.customId === 'bj_stand' || handTotal(playerHand) === 21) {
				collector.stop('stand');
				// Dealer draws to 17
				while (handTotal(dealerHand) < 17) dealerHand.push(deck.pop());

				const pt = handTotal(playerHand);
				const dt = handTotal(dealerHand);
				let result, desc;

				if (dt > 21 || pt > dt) {
					// Player wins
					result = 'win';
					await user.update({ wallet: user.wallet + bet * 2 });
					desc = `🎉 You win! Dealer had ${dt}. You won **${bet} coins**!`;
				} else if (pt === dt) {
					// Push
					result = 'push';
					await user.update({ wallet: user.wallet + bet });
					desc = `🤝 Push! It's a tie — your bet of **${bet} coins** was returned.`;
				} else {
					// Dealer wins
					result = 'lose';
					desc = `😞 Dealer wins with ${dt}. You lost **${bet} coins**.`;
				}

				const embed = buildEmbed(playerHand, dealerHand, true, bet, result).setDescription(desc);
				await btnInt.update({ embeds: [embed], components: [] });
			}
		});

		collector.on('end', async (_, reason) => {
			if (reason === 'time') {
				// Timeout — refund bet
				await user.update({ wallet: user.wallet + bet });
				await msg.edit({ content: 'Game timed out. Bet refunded.', components: [] }).catch(() => {});
			}
		});
	},
};
