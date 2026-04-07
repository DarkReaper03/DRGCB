// =============================================
// Command: /whereami
// Tells the user which server they're in and its member count
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('whereami')
		.setDescription('Shows the current server name and member count.'),

	async execute(interaction) {
		await interaction.reply({
			content: `You are on **${interaction.guild.name}**, which has **${interaction.guild.memberCount}** members.`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
