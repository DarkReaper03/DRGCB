const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Fetches a random cat image 🐱'),

  async execute(interaction) {
    try {
      // Fetch a random cat image from The Cat API
      const response = await axios.get('https://api.thecatapi.com/v1/images/search');
      const catUrl = response.data[0].url;

      const embed = new EmbedBuilder()
        .setTitle('🐱 Random Cat')
        .setImage(catUrl)
        .setColor('#5865F2')
        .setFooter({ text: 'Powered by The Cat API' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      // Handle API errors gracefully
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Could not fetch a cat image right now. Try again later!')
        .setColor('#F00000');

      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  },
};
