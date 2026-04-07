// =============================================
// Command: /balance
// Show wallet + bank balance for you or another user
// =============================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
		.setName('balance')
		.setDescription('Check your (or another user\'s) coin balance.')
		.addUserOption(opt =>
			opt.setName('user').setDescription('User to check (defaults to you)').setRequired(false),
		),

	async execute(interaction) {
		const target = interaction.options.getUser('user') ?? interaction.user;
		const user = await getUser(target.id, interaction.guildId);

		const embed = new EmbedBuilder()
			.setTitle(`${target.username}'s Balance`)
			.setColor(0xF1C40F)
			.setThumbnail(target.displayAvatarURL())
			.addFields(
				{ name: '👛 Wallet', value: `**${user.wallet.toLocaleString()}** coins`, inline: true },
				{ name: '🏦 Bank', value: `**${user.bank.toLocaleString()}** coins`, inline: true },
				{ name: '💰 Total', value: `**${(user.wallet + user.bank).toLocaleString()}** coins`, inline: true },
			)
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};
