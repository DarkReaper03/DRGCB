// =============================================
// Command: /linkwatcher
// Configure DC Link Watcher settings per server:
// max-warnings, action (kick/ban/none), notify channel
// (Ported from DC Link Watcher eris bot)
// =============================================

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { guilds, saveAll } = require('../modules/linkWatcherState.js');

// Action constants matching linkWatcherState
const NO_ACTION = 0;
const ACTION_BAN = 1;
const ACTION_KICK = 2;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('linkwatcher')
		.setDescription('Configure link watcher settings for this server.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // Only server managers can configure
		.addSubcommand(sub =>
			sub.setName('get-settings')
				.setDescription('Show current link watcher settings for this server.'),
		)
		.addSubcommand(sub =>
			sub.setName('set-max-warnings')
				.setDescription('Set how many warnings before action is taken (resets daily).')
				.addIntegerOption(o =>
					o.setName('amount')
						.setDescription('Number of warnings before action (e.g. 4).')
						.setRequired(true)
						.setMinValue(1)
						.setMaxValue(20),
				),
		)
		.addSubcommand(sub =>
			sub.setName('set-action')
				.setDescription('Set the action taken when a user exhausts their warnings.')
				.addStringOption(o =>
					o.setName('action-type')
						.setDescription('Action to take.')
						.setRequired(true)
						.addChoices(
							{ name: 'None (delete only)', value: 'none' },
							{ name: 'Kick', value: 'kick' },
							{ name: 'Ban', value: 'ban' },
						),
				),
		)
		.addSubcommand(sub =>
			sub.setName('set-notify-channel')
				.setDescription('Set the channel where phishing detections are logged.')
				.addChannelOption(o =>
					o.setName('channel')
						.setDescription('Channel to log detections in.')
						.setRequired(true),
				),
		),

	async execute(interaction) {
		const sub = interaction.options.getSubcommand();
		const guildId = interaction.guild.id;

		// Get or create guild settings
		let settings = guilds.get(guildId);
		if (!settings) {
			settings = { notify_channel: null, max_warnings: 4, action: ACTION_KICK };
			guilds.set(guildId, settings);
		}

		// --- get-settings ---
		if (sub === 'get-settings') {
			const actionName = { [NO_ACTION]: 'none', [ACTION_BAN]: 'ban', [ACTION_KICK]: 'kick' }[settings.action] ?? 'unknown';
			const channelMention = settings.notify_channel ? `<#${settings.notify_channel}>` : 'Not set';

			return interaction.reply({
				content: `**Link Watcher Settings for this server:**\n` +
					`Max Warnings: \`${settings.max_warnings}\`\n` +
					`Action: \`${actionName}\`\n` +
					`Notify Channel: ${channelMention}`,
				flags: MessageFlags.Ephemeral,
			});
		}

		// --- set-max-warnings ---
		if (sub === 'set-max-warnings') {
			settings.max_warnings = interaction.options.getInteger('amount');
			saveAll();
			return interaction.reply({ content: `Max warnings set to \`${settings.max_warnings}\`.`, flags: MessageFlags.Ephemeral });
		}

		// --- set-action ---
		if (sub === 'set-action') {
			const value = interaction.options.getString('action-type');
			settings.action = value === 'ban' ? ACTION_BAN : value === 'kick' ? ACTION_KICK : NO_ACTION;
			saveAll();
			return interaction.reply({ content: `Action set to \`${value}\`.`, flags: MessageFlags.Ephemeral });
		}

		// --- set-notify-channel ---
		if (sub === 'set-notify-channel') {
			const channel = interaction.options.getChannel('channel');
			settings.notify_channel = channel.id;
			saveAll();
			return interaction.reply({ content: `Notify channel set to ${channel}.`, flags: MessageFlags.Ephemeral });
		}
	},
};
