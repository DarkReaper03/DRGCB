// =============================================
// Command: /disconnect
// Kicks a user from their current voice channel
// Requires Move Members permission
// (Ported from DC Dissconnect)
// =============================================

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('disconnect')
		.setDescription('Disconnect a user from their voice channel.')
		.addUserOption(option =>
			option.setName('member')
				.setDescription('The user to disconnect.')
				.setRequired(true),
		),

	async execute(interaction) {
		// Check caller has permission to move members
		if (!interaction.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
			return interaction.reply({ content: 'You need the **Move Members** permission to use this.', flags: MessageFlags.Ephemeral });
		}

		const member = interaction.options.getMember('member');

		if (!member) {
			return interaction.reply({ content: 'Could not find that member.', flags: MessageFlags.Ephemeral });
		}

		// Check target is actually in a voice channel
		if (!member.voice?.channel) {
			return interaction.reply({ content: `${member} is not in a voice channel.`, flags: MessageFlags.Ephemeral });
		}

		try {
			// Setting channel to null disconnects the user
			await member.voice.setChannel(null);
			await interaction.reply({ content: `${member} has been disconnected from the voice channel.` });
		} catch (err) {
			if (err.code === 50013) {
				return interaction.reply({ content: 'I don\'t have permission to disconnect that user.', flags: MessageFlags.Ephemeral });
			}
			return interaction.reply({ content: `Error: ${err.message}`, flags: MessageFlags.Ephemeral });
		}
	},
};
