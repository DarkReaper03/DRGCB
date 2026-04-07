// =============================================
// Event: InteractionCreate
// Routes slash commands, autocomplete,
// and button interactions (tickets, etc.)
// =============================================

const { Events, MessageFlags } = require('discord.js');
const { handleTicketButton } = require('../modules/ticketHandler.js');

module.exports = {
	name: Events.InteractionCreate,

	async execute(interaction) {
		// --- Slash Commands ---
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) {
				console.error(`[Commands] No handler for /${interaction.commandName}`);
				return;
			}
			try {
				await command.execute(interaction);
			} catch (err) {
				console.error(`[Commands] Error in /${interaction.commandName}:`, err);
				const reply = { content: 'Something went wrong running that command.', flags: MessageFlags.Ephemeral };
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp(reply).catch(() => {});
				} else {
					await interaction.reply(reply).catch(() => {});
				}
			}
		}

		// --- Autocomplete ---
		else if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command?.autocomplete) return;
			try {
				await command.autocomplete(interaction);
			} catch (err) {
				console.error(`[Autocomplete] Error for /${interaction.commandName}:`, err);
			}
		}

		// --- Button Interactions (tickets) ---
		else if (interaction.isButton()) {
			const id = interaction.customId;
			if (['ticket_open', 'ticket_close', 'ticket_claim', 'ticket_transcript'].includes(id)) {
				await handleTicketButton(interaction);
			}
		}
	},
};
