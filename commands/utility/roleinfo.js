const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Get information about a role 🏷️')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to inspect')
        .setRequired(true)
    ),

  async execute(interaction) {
    const role = interaction.options.getRole('role');

    // Count how many guild members have this role
    // Fetch members first to ensure the cache is populated
    await interaction.guild.members.fetch();
    const memberCount = interaction.guild.members.cache.filter(m =>
      m.roles.cache.has(role.id)
    ).size;

    // Format creation date
    const createdAt = `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`;

    // Get the role's key permissions as readable strings
    // Only show notable permissions to keep it clean
    const notablePerms = [
      'Administrator',
      'ManageGuild',
      'ManageChannels',
      'ManageRoles',
      'ManageMessages',
      'KickMembers',
      'BanMembers',
      'MentionEveryone',
      'ModerateMembers',
      'ManageWebhooks',
      'ManageNicknames',
      'ViewAuditLog',
      'SendMessages',
      'EmbedLinks',
      'AttachFiles',
      'AddReactions',
      'UseExternalEmojis',
      'Connect',
      'Speak',
      'MuteMembers',
      'DeafenMembers',
      'MoveMembers',
    ];

    const grantedPerms = notablePerms.filter(perm =>
      role.permissions.has(PermissionsBitField.Flags[perm])
    );

    const permText = grantedPerms.length > 0
      ? grantedPerms.join(', ')
      : 'No notable permissions';

    const embed = new EmbedBuilder()
      .setTitle(`🏷️ Role Info — ${role.name}`)
      .setColor(role.color || '#5865F2')
      .addFields(
        { name: 'Name', value: role.name, inline: true },
        { name: 'ID', value: role.id, inline: true },
        { name: 'Color', value: role.hexColor, inline: true },
        { name: 'Position', value: `${role.position}`, inline: true },
        { name: 'Members', value: `${memberCount}`, inline: true },
        { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: 'Managed', value: role.managed ? 'Yes (bot/integration)' : 'No', inline: true },
        { name: 'Created', value: createdAt },
        { name: 'Permissions', value: permText },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
