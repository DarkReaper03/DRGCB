const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');

// Snowflake regex — Discord IDs are 17-19 digit numbers
const SNOWFLAKE_REGEX = /^\d{17,19}$/;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their Discord ID')
    .addStringOption(opt =>
      opt.setName('userid')
        .setDescription('The Discord user ID to unban')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const userId = interaction.options.getString('userid').trim();

    // Validate snowflake format before hitting the API
    if (!SNOWFLAKE_REGEX.test(userId)) {
      return interaction.reply({
        content: `\`${userId}\` is not a valid Discord user ID. IDs are 17–19 digit numbers.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Check the user is actually banned before trying to unban
    let banEntry;
    try {
      banEntry = await interaction.guild.bans.fetch(userId);
    } catch {
      return interaction.reply({
        content: `No ban found for user ID \`${userId}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Remove the ban
    await interaction.guild.bans.remove(userId, `Unbanned by ${interaction.user.tag}`);

    const embed = new EmbedBuilder()
      .setColor(0x00cc66)
      .setTitle('User Unbanned')
      .addFields(
        { name: 'User', value: `${banEntry.user.tag} (${userId})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
