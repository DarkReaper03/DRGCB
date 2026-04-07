const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information about a user 👤')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to inspect (defaults to you)')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Resolve to the target user, or the command invoker if none provided
    const targetUser = interaction.options.getUser('user') ?? interaction.user;

    // Fetch the GuildMember for server-specific info (nickname, join date, roles)
    let member;
    try {
      member = await interaction.guild.members.fetch(targetUser.id);
    } catch {
      // User might not be in the server
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`Could not find **${targetUser.tag}** in this server.`)
        .setColor('#F00000');
      return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }

    // Format timestamps as Discord relative/absolute
    const accountCreated = `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`;
    const joinedServer = member.joinedTimestamp
      ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
      : 'Unknown';

    // Get all roles except @everyone, sorted by position (highest first)
    const roles = member.roles.cache
      .filter(r => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r.toString());

    const rolesText = roles.length > 0
      ? roles.join(', ')
      : 'No roles';

    // Trim roles text if it's too long for an embed field (1024 char limit)
    const rolesDisplay = rolesText.length > 1000
      ? rolesText.slice(0, 997) + '...'
      : rolesText;

    const embed = new EmbedBuilder()
      .setTitle(`👤 User Info — ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .setColor(member.displayHexColor !== '#000000' ? member.displayHexColor : '#5865F2')
      .addFields(
        { name: 'Username', value: targetUser.tag, inline: true },
        { name: 'ID', value: targetUser.id, inline: true },
        { name: 'Nickname', value: member.nickname ?? 'None', inline: true },
        { name: 'Account Created', value: accountCreated },
        { name: 'Joined Server', value: joinedServer },
        { name: `Roles (${roles.length})`, value: rolesDisplay },
      )
      .setTimestamp();

    // Show bot badge if applicable
    if (targetUser.bot) {
      embed.setDescription('🤖 This user is a bot.');
    }

    await interaction.reply({ embeds: [embed] });
  },
};
