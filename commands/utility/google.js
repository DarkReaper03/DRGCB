const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('google')
    .setDescription('Generate a Google search link 🔍')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('What do you want to search for?')
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString('query');

    // Build the Google search URL — no API key needed
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    const embed = new EmbedBuilder()
      .setTitle('🔍 Google Search')
      .setDescription(`[Click here to search Google for **${query}**](${searchUrl})`)
      .setColor('#5865F2')
      .setFooter({ text: 'Opens Google in your browser' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
