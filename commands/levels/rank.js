// =============================================
// Command: /rank
// Show XP rank card for a user using canvacord v5
// =============================================

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { RankCardBuilder, Font } = require('canvacord');
const db = require('../../database.js');

// XP required to reach each level: 100 * level^1.5
function xpForLevel(level) {
	return Math.floor(100 * Math.pow(level, 1.5));
}

async function getUser(userId, guildId) {
	const [user] = await db.User.findOrCreate({
		where: { userId, guildId },
		defaults: { xp: 0, level: 0 },
	});
	return user;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('rank')
		.setDescription('View your (or another user\'s) XP rank card.')
		.addUserOption(opt =>
			opt.setName('user').setDescription('User to check (defaults to you)').setRequired(false),
		),

	async execute(interaction) {
		await interaction.deferReply();

		const target = interaction.options.getUser('user') ?? interaction.user;
		const member = await interaction.guild.members.fetch(target.id).catch(() => null);
		const user = await getUser(target.id, interaction.guildId);

		// Get server rank (position by XP descending)
		const allUsers = await db.User.findAll({
			where: { guildId: interaction.guildId },
			order: [['xp', 'DESC']],
			attributes: ['userId'],
		});
		const rank = allUsers.findIndex(u => u.userId === target.id) + 1;

		const currentXp = user.xp;
		const currentLevel = user.level;
		const xpNeeded = xpForLevel(currentLevel + 1);

		// Load font (canvacord v5 needs fonts registered)
		await Font.loadDefault();

		const card = new RankCardBuilder()
			.setAvatar(target.displayAvatarURL({ extension: 'png', size: 256 }))
			.setUsername(target.username)
			.setDisplayName(member?.displayName ?? target.username)
			.setCurrentXP(currentXp)
			.setRequiredXP(xpNeeded)
			.setLevel(currentLevel)
			.setRank(rank)
			.setBackground('#1A1A1A')
			.setTextStyles({
				level: 'LEVEL',
				xp: 'XP',
				rank: 'RANK',
			});

		const image = await card.build({ format: 'png' });
		const attachment = new AttachmentBuilder(image, { name: 'rank.png' });

		await interaction.editReply({ files: [attachment] });
	},
};
