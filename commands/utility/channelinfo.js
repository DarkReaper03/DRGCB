const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

// Maps Discord ChannelType enum values to human-readable strings
const CHANNEL_TYPE_NAMES = {
  [ChannelType.GuildText]: 'Text Channel',
  [ChannelType.GuildVoice]: 'Voice Channel',
  [ChannelType.GuildCategory]: 'Category',
  [ChannelType.GuildAnnouncement]: 'Announcement Channel',
  [ChannelType.GuildStageVoice]: 'Stage Channel',
  [ChannelType.GuildForum]: 'Forum Channel',
  [ChannelType.GuildMedia]: 'Media Channel',
  [ChannelType.PublicThread]: 'Public Thread',
  [ChannelType.PrivateThread]: 'Private Thread',
  [ChannelType.AnnouncementThread]: 'Announcement Thread',
  [ChannelType.DM]: 'DM',
  [ChannelType.GroupDM]: 'Group DM',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Get information about a channel 📋')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to inspect (defaults to current channel)')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Use the provided channel or fall back to the current one
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    const createdAt = `<t:${Math.floor(channel.createdTimestamp / 1000)}:F>`;
    const typeName = CHANNEL_TYPE_NAMES[channel.type] ?? `Unknown (${channel.type})`;

    // Category name (parent) if available
    const category = channel.parent
      ? channel.parent.name
      : 'None';

    // Topic only exists on text-like channels
    const topic = channel.topic || 'No topic set';

    // NSFW flag only relevant on text channels
    const nsfw = 'nsfw' in channel ? (channel.nsfw ? 'Yes' : 'No') : 'N/A';

    // Slowmode in seconds (0 means off)
    const slowmode = 'rateLimitPerUser' in channel
      ? (channel.rateLimitPerUser ? `${channel.rateLimitPerUser}s` : 'Off')
      : 'N/A';

    const embed = new EmbedBuilder()
      .setTitle(`📋 Channel Info — #${channel.name}`)
      .setColor('#5865F2')
      .addFields(
        { name: 'Name', value: channel.name, inline: true },
        { name: 'ID', value: channel.id, inline: true },
        { name: 'Type', value: typeName, inline: true },
        { name: 'Category', value: category, inline: true },
        { name: 'NSFW', value: nsfw, inline: true },
        { name: 'Slowmode', value: slowmode, inline: true },
        { name: 'Created', value: createdAt },
        { name: 'Topic', value: topic },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
