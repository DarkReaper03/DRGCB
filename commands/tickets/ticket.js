// =============================================
// Command: /ticket
// Subcommands: setup (panel), open (user opens ticket)
// Requires: Manage Channels for setup
// =============================================

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ticket')
		.setDescription('Ticket system.')

		// /ticket setup
		.addSubcommand(sub =>
			sub.setName('setup')
				.setDescription('Post the ticket panel in a channel. (Manage Channels)')
				.addChannelOption(opt =>
					opt.setName('channel').setDescription('Channel to post the panel in').setRequired(true),
				),
		)

		// /ticket open
		.addSubcommand(sub =>
			sub.setName('open')
				.setDescription('Open a support ticket.')
				.addStringOption(opt =>
					opt.setName('reason').setDescription('Brief reason for the ticket').setRequired(false),
				),
		),

	async execute(interaction) {
		const sub = interaction.options.getSubcommand();

		if (sub === 'setup') {
			if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
				return interaction.reply({ content: 'You need **Manage Channels** to set up the ticket panel.', flags: MessageFlags.Ephemeral });
			}

			const channel = interaction.options.getChannel('channel');

			const embed = new EmbedBuilder()
				.setTitle('🎫 Support Tickets')
				.setDescription('Click the button below to open a support ticket. Our team will assist you shortly.')
				.setColor(0x5865F2)
				.setFooter({ text: interaction.guild.name });

			const row = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId('ticket_open')
					.setLabel('Open Ticket')
					.setEmoji('🎫')
					.setStyle(ButtonStyle.Primary),
			);

			await channel.send({ embeds: [embed], components: [row] });
			await interaction.reply({ content: `Ticket panel posted in ${channel}.`, flags: MessageFlags.Ephemeral });
		}

		else if (sub === 'open') {
			const reason = interaction.options.getString('reason') ?? 'No reason provided.';
			await openTicket(interaction, reason);
		}
	},
};

// Create a new ticket channel for the user
async function openTicket(interaction, reason) {
	const guild = interaction.guild;

	// Check if user already has an open ticket
	const existing = await db.Ticket.findOne({
		where: { userId: interaction.user.id, guildId: guild.id, status: 'open' },
	});

	if (existing) {
		return interaction.reply({
			content: `You already have an open ticket: <#${existing.channelId}>`,
			flags: MessageFlags.Ephemeral,
		});
	}

	// Create the ticket channel
	const channel = await guild.channels.create({
		name: `ticket-${interaction.user.username}`,
		parent: null, // you can set a category ID here if you want
		permissionOverwrites: [
			{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
			{
				id: interaction.user.id,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
			},
		],
	});

	// Save to DB
	const ticket = await db.Ticket.create({
		userId: interaction.user.id,
		guildId: guild.id,
		channelId: channel.id,
		status: 'open',
	});

	// Send ticket info inside the channel
	const embed = new EmbedBuilder()
		.setTitle('🎫 Support Ticket')
		.setColor(0x5865F2)
		.addFields(
			{ name: 'User', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
			{ name: 'Reason', value: reason, inline: false },
		)
		.setTimestamp();

	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success),
		new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger),
	);

	await channel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });

	await interaction.reply({
		content: `Your ticket has been created: ${channel}`,
		flags: MessageFlags.Ephemeral,
	});
}
