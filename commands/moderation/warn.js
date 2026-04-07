const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a member')
    .addUserOption(opt =>
      opt.setName('member')
        .setDescription('The member to warn')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason');

    // Don't allow warning bots
    if (target.bot) {
      return interaction.reply({
        content: 'You cannot warn a bot.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Can't warn yourself
    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: 'You cannot warn yourself.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Create the warning record in the database
    const warning = await db.Warning.create({
      userId: target.id,
      guildId: interaction.guild.id,
      reason,
      moderatorId: interaction.user.id,
    });

    // Count total warnings for this user in this guild
    const totalWarnings = await db.Warning.count({
      where: { userId: target.id, guildId: interaction.guild.id },
    });

    // Try to DM the warned user
    try {
      await target.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffcc00)
            .setTitle(`You have been warned in ${interaction.guild.name}`)
            .addFields(
              { name: 'Reason', value: reason },
              { name: 'Case ID', value: `#${warning.caseId}` },
              { name: 'Total Warnings', value: `${totalWarnings}` },
            )
            .setTimestamp(),
        ],
      });
    } catch {
      // User may have DMs closed
    }

    // Reply to the moderator with the case details
    const embed = new EmbedBuilder()
      .setColor(0xffcc00)
      .setTitle('Warning Issued')
      .addFields(
        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Case ID', value: `#${warning.caseId}`, inline: true },
        { name: 'Reason', value: reason },
        { name: 'Total Warnings', value: `${totalWarnings} warning(s) in this server` },
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
