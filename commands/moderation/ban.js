const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(opt =>
      opt.setName('member')
        .setDescription('The member to ban')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false))
    // Require caller to have BanMembers permission
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    // Validate target exists in the guild
    if (!target) {
      return interaction.reply({
        content: 'That user is not in this server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Can't ban yourself
    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: 'You cannot ban yourself.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Check if the bot actually has permission to ban this member (role hierarchy)
    if (!target.bannable) {
      return interaction.reply({
        content: 'I do not have permission to ban that member. They may have a higher role than me.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Try to DM the user before banning (they lose server access after)
    try {
      await target.user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff4444)
            .setTitle(`You have been banned from ${interaction.guild.name}`)
            .addFields({ name: 'Reason', value: reason })
            .setTimestamp(),
        ],
      });
    } catch {
      // DMs might be closed — not a blocking error
    }

    // Execute the ban and log to audit
    await target.ban({ reason: `${interaction.user.tag}: ${reason}` });

    // Confirm to the moderator
    const embed = new EmbedBuilder()
      .setColor(0xff4444)
      .setTitle('Member Banned')
      .addFields(
        { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason },
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
