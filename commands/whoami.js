// =============================================
// Command: /whoami
// Tells the user their username and join date
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('whoami')
		.setDescription('Shows your username and when you joined this server.'),

	async execute(interaction) {
		await interaction.reply({
			content: `You are **${interaction.user.username}**, and you joined this server on **${interaction.member.joinedAt.toDateString()}**.`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
