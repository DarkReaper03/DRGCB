const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(opt =>
      opt.setName('member')
        .setDescription('The member to kick')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false))
    // Require caller to have KickMembers permission
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    // Validate target is in the guild
    if (!target) {
      return interaction.reply({
        content: 'That user is not in this server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Can't kick yourself
    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: 'You cannot kick yourself.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Check role hierarchy — bot must be above the target
    if (!target.kickable) {
      return interaction.reply({
        content: 'I do not have permission to kick that member. They may have a higher role than me.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Try to DM before kicking so they receive the message
    try {
      await target.user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff8800)
            .setTitle(`You have been kicked from ${interaction.guild.name}`)
            .addFields({ name: 'Reason', value: reason })
            .setTimestamp(),
        ],
      });
    } catch {
      // DMs may be closed — not a blocking error
    }

    // Execute the kick
    await target.kick(`${interaction.user.tag}: ${reason}`);

    // Confirm to the moderator
    const embed = new EmbedBuilder()
      .setColor(0xff8800)
      .setTitle('Member Kicked')
      .addFields(
        { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason },
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
