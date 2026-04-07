// =============================================
// Command: /hiddenmsg (OWNER ONLY)
// Sends a message through a webhook as "Dark Reaper"
// Registered only in your private guild — invisible elsewhere
// (Ported from DC Dissconnect)
// =============================================

const { SlashCommandBuilder, WebhookClient, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('hiddenmsg')
		.setDescription('(Owner only) Send a message via webhook.')
		.addStringOption(option =>
			option.setName('message')
				.setDescription('The message to send.')
				.setRequired(true),
		),

	async execute(interaction) {
		// Only the bot owner can use this
		if (interaction.user.id !== process.env.OWNER_ID) {
			console.log(`[hiddenmsg] Unauthorized attempt by ${interaction.user.tag} (${interaction.user.id})`);
			return interaction.reply({ content: 'You are not authorized to use this command.', flags: MessageFlags.Ephemeral });
		}

		// Webhook URL must be set in .env
		if (!process.env.WEBHOOK_URL) {
			return interaction.reply({ content: 'No webhook URL configured.', flags: MessageFlags.Ephemeral });
		}

		const message = interaction.options.getString('message');

		try {
			const webhook = new WebhookClient({ url: process.env.WEBHOOK_URL });
			await webhook.send({ content: message, username: 'Dark Reaper' });
			webhook.destroy();

			console.log(`[hiddenmsg] Sent by ${interaction.user.tag}: ${message}`);
			await interaction.reply({ content: '✅ Message sent.', flags: MessageFlags.Ephemeral });
		} catch (err) {
			await interaction.reply({ content: `Webhook failed: ${err.message}`, flags: MessageFlags.Ephemeral });
		}
	},
};
