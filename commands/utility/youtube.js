const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('youtube')
    .setDescription('Search YouTube for a video 🎥')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('What do you want to search for?')
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString('query');

    // Build the YouTube search URL — no API key needed
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    const embed = new EmbedBuilder()
      .setTitle('🎥 YouTube Search')
      .setDescription(`[Click here to see results for **${query}**](${searchUrl})`)
      .setColor('#5865F2')
      .setFooter({ text: 'Opens YouTube in your browser' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
