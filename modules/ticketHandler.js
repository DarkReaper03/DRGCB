// =============================================
// Module: ticketHandler
// Handles ticket button interactions:
//   ticket_close, ticket_claim, ticket_transcript
// Also handles the ticket_open button from the panel
// =============================================

const { EmbedBuilder, PermissionFlagsBits, MessageFlags, AttachmentBuilder } = require('discord.js');
const db = require('../database.js');

// ---- Handle all ticket-related button clicks ----
async function handleTicketButton(interaction) {
	const { customId, guild, channel, user } = interaction;

	if (customId === 'ticket_open') {
		return handleTicketOpen(interaction);
	}

	// For claim/close/transcript the channel must be a ticket channel
	const ticket = await db.Ticket.findOne({
		where: { channelId: channel.id, guildId: guild.id },
	});

	if (!ticket) {
		return interaction.reply({ content: 'This is not a recognised ticket channel.', flags: MessageFlags.Ephemeral });
	}

	if (customId === 'ticket_claim') {
		await handleClaim(interaction, ticket);
	} else if (customId === 'ticket_transcript') {
		await handleTranscript(interaction, ticket);
	} else if (customId === 'ticket_close') {
		await handleClose(interaction, ticket);
	}
}

// ---- Open a ticket from the panel button ----
async function handleTicketOpen(interaction) {
	const { guild, user } = interaction;

	const existing = await db.Ticket.findOne({
		where: { userId: user.id, guildId: guild.id, status: 'open' },
	});

	if (existing) {
		return interaction.reply({
			content: `You already have an open ticket: <#${existing.channelId}>`,
			flags: MessageFlags.Ephemeral,
		});
	}

	const channel = await guild.channels.create({
		name: `ticket-${user.username}`,
		permissionOverwrites: [
			{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
			{
				id: user.id,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
			},
		],
	});

	await db.Ticket.create({
		userId: user.id,
		guildId: guild.id,
		channelId: channel.id,
		status: 'open',
	});

	const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success),
		new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger),
	);

	const embed = new EmbedBuilder()
		.setTitle('🎫 Support Ticket')
		.setDescription('A staff member will be with you shortly. Please describe your issue.')
		.setColor(0x5865F2)
		.addFields({ name: 'User', value: `${user}`, inline: true })
		.setTimestamp();

	await channel.send({ content: `${user}`, embeds: [embed], components: [row] });
	await interaction.reply({ content: `Your ticket: ${channel}`, flags: MessageFlags.Ephemeral });
}

// ---- Claim a ticket ----
async function handleClaim(interaction, ticket) {
	if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
		return interaction.reply({ content: 'You need **Manage Channels** to claim tickets.', flags: MessageFlags.Ephemeral });
	}

	if (ticket.claimedBy) {
		return interaction.reply({ content: `This ticket is already claimed by <@${ticket.claimedBy}>.`, flags: MessageFlags.Ephemeral });
	}

	await ticket.update({ claimedBy: interaction.user.id });
	await interaction.reply({ content: `✅ ${interaction.user} has claimed this ticket.` });
}

// ---- Generate transcript and send to user ----
async function handleTranscript(interaction, ticket) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	// Fetch up to 500 messages and build a plain-text transcript
	const messages = await interaction.channel.messages.fetch({ limit: 100 });
	const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

	const lines = sorted.map(m =>
		`[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`,
	);

	const buffer = Buffer.from(lines.join('\n'), 'utf-8');
	const attachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}.txt` });

	try {
		const dmChannel = await interaction.user.createDM();
		await dmChannel.send({
			content: `📄 Transcript for ticket in **${interaction.guild.name}**:`,
			files: [attachment],
		});
		await interaction.editReply('Transcript sent to your DMs.');
	} catch {
		await interaction.editReply({ content: 'Could not DM you the transcript. Check your privacy settings.', files: [attachment] });
	}
}

// ---- Close and delete the ticket channel ----
async function handleClose(interaction, ticket) {
	if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) && interaction.user.id !== ticket.userId) {
		return interaction.reply({ content: 'Only staff or the ticket creator can close this ticket.', flags: MessageFlags.Ephemeral });
	}

	await ticket.update({ status: 'closed' });
	await interaction.reply('🔒 Ticket closing in 5 seconds...');
	setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

module.exports = { handleTicketButton };
