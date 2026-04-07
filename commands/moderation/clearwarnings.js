// =============================================
// Command: /clearwarnings
// Remove all warnings for a user in this guild
// Requires: Moderate Members
// =============================================

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('clearwarnings')
		.setDescription('Clear all warnings for a user.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(opt =>
			opt.setName('user').setDescription('The user to clear warnings for').setRequired(true),
		),

	async execute(interaction) {
		const target = interaction.options.getUser('user');

		const count = await db.Warning.destroy({
			where: { userId: target.id, guildId: interaction.guildId },
		});

		if (count === 0) {
			return interaction.reply({
				content: `${target.tag} has no warnings to clear.`,
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.reply({
			content: `Cleared **${count}** warning(s) for ${target.tag}.`,
		});
	},
};
