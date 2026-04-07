// =============================================
// Command: /warnings
// List all warnings for a user (paginated)
// =============================================

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('warnings')
		.setDescription('View all warnings for a user.')
		.addUserOption(opt =>
			opt.setName('user').setDescription('The user to check').setRequired(true),
		),

	async execute(interaction) {
		const target = interaction.options.getUser('user');

		// Fetch all warnings for this user in this guild
		const warns = await db.Warning.findAll({
			where: { userId: target.id, guildId: interaction.guildId },
			order: [['createdAt', 'DESC']],
		});

		if (!warns.length) {
			return interaction.reply({
				content: `${target.tag} has no warnings in this server.`,
				flags: MessageFlags.Ephemeral,
			});
		}

		// Build paginated embed (up to 10 per page)
		const pageSize = 10;
		const totalPages = Math.ceil(warns.length / pageSize);
		const page = 1;
		const slice = warns.slice(0, pageSize);

		const embed = new EmbedBuilder()
			.setTitle(`Warnings — ${target.tag}`)
			.setColor(0xE74C3C)
			.setThumbnail(target.displayAvatarURL())
			.setFooter({ text: `Total: ${warns.length} warning(s) | Page ${page}/${totalPages}` })
			.setTimestamp();

		for (const w of slice) {
			const mod = await interaction.client.users.fetch(w.moderatorId).catch(() => null);
			embed.addFields({
				name: `Case #${w.caseId}`,
				value: `**Reason:** ${w.reason}\n**Moderator:** ${mod?.tag ?? 'Unknown'}\n**Date:** <t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:R>`,
				inline: false,
			});
		}

		await interaction.reply({ embeds: [embed] });
	},
};
