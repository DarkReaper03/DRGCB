// =============================================
// Command: /giveaway
// Subcommands: start, end, reroll
// Requires: Manage Guild
// =============================================

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ms = require('ms'); // converts "1h", "30m" etc.

module.exports = {
	data: new SlashCommandBuilder()
		.setName('giveaway')
		.setDescription('Manage giveaways.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

		// /giveaway start
		.addSubcommand(sub =>
			sub.setName('start')
				.setDescription('Start a new giveaway.')
				.addStringOption(opt =>
					opt.setName('duration').setDescription('Duration e.g. 1h, 30m, 1d').setRequired(true),
				)
				.addIntegerOption(opt =>
					opt.setName('winners').setDescription('Number of winners').setMinValue(1).setRequired(true),
				)
				.addStringOption(opt =>
					opt.setName('prize').setDescription('What you are giving away').setRequired(true),
				)
				.addChannelOption(opt =>
					opt.setName('channel').setDescription('Channel to host the giveaway (defaults to current)').setRequired(false),
				),
		)

		// /giveaway end
		.addSubcommand(sub =>
			sub.setName('end')
				.setDescription('End a giveaway early.')
				.addStringOption(opt =>
					opt.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true),
				),
		)

		// /giveaway reroll
		.addSubcommand(sub =>
			sub.setName('reroll')
				.setDescription('Reroll winners for an ended giveaway.')
				.addStringOption(opt =>
					opt.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true),
				),
		),

	async execute(interaction) {
		const sub = interaction.options.getSubcommand();
		const manager = interaction.client.giveawaysManager;

		if (sub === 'start') {
			const durationStr = interaction.options.getString('duration');
			const duration = ms(durationStr);

			if (!duration || duration < 5000) {
				return interaction.reply({
					content: 'Invalid duration. Examples: `10m`, `1h`, `2d`.',
					flags: MessageFlags.Ephemeral,
				});
			}

			const winnerCount = interaction.options.getInteger('winners');
			const prize = interaction.options.getString('prize');
			const channel = interaction.options.getChannel('channel') ?? interaction.channel;

			await manager.start(channel, {
				duration,
				winnerCount,
				prize,
				hostedBy: interaction.user,
			});

			await interaction.reply({
				content: `🎉 Giveaway for **${prize}** started in ${channel}!`,
				flags: MessageFlags.Ephemeral,
			});
		}

		else if (sub === 'end') {
			const messageId = interaction.options.getString('message_id');
			try {
				await manager.end(messageId);
				await interaction.reply({ content: 'Giveaway ended.', flags: MessageFlags.Ephemeral });
			} catch {
				await interaction.reply({
					content: 'Could not find that giveaway. Check the message ID.',
					flags: MessageFlags.Ephemeral,
				});
			}
		}

		else if (sub === 'reroll') {
			const messageId = interaction.options.getString('message_id');
			try {
				await manager.reroll(messageId);
				await interaction.reply({ content: '🎲 Giveaway rerolled!', flags: MessageFlags.Ephemeral });
			} catch {
				await interaction.reply({
					content: 'Could not reroll. Make sure the giveaway has ended and the message ID is correct.',
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};
