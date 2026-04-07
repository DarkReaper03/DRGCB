// =============================================
// Command: /transfer
// Send coins from your wallet to another user
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');

async function getUser(userId, guildId) {
	const [user] = await db.User.findOrCreate({
		where: { userId, guildId },
		defaults: { wallet: 0, bank: 0 },
	});
	return user;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('transfer')
		.setDescription('Send coins from your wallet to another user.')
		.addUserOption(opt =>
			opt.setName('user').setDescription('Who to send coins to').setRequired(true),
		)
		.addIntegerOption(opt =>
			opt.setName('amount').setDescription('Amount to send').setMinValue(1).setRequired(true),
		),

	async execute(interaction) {
		const target = interaction.options.getUser('user');
		const amount = interaction.options.getInteger('amount');

		// Can't send to yourself or bots
		if (target.id === interaction.user.id) {
			return interaction.reply({ content: 'You can\'t transfer to yourself.', flags: MessageFlags.Ephemeral });
		}
		if (target.bot) {
			return interaction.reply({ content: 'You can\'t send coins to a bot.', flags: MessageFlags.Ephemeral });
		}

		const sender = await getUser(interaction.user.id, interaction.guildId);

		if (sender.wallet < amount) {
			return interaction.reply({
				content: `You only have **${sender.wallet}** coins in your wallet.`,
				flags: MessageFlags.Ephemeral,
			});
		}

		const receiver = await getUser(target.id, interaction.guildId);

		// Deduct from sender, add to receiver
		await sender.update({ wallet: sender.wallet - amount });
		await receiver.update({ wallet: receiver.wallet + amount });

		await interaction.reply(
			`💸 **${interaction.user.username}** sent **${amount.toLocaleString()} coins** to **${target.username}**.`,
		);
	},
};
