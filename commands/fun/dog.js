const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dog')
    .setDescription('Fetches a random dog image 🐶'),

  async execute(interaction) {
    try {
      // Fetch a random dog image from dog.ceo
      const response = await axios.get('https://dog.ceo/api/breeds/image/random');
      const dogUrl = response.data.message;

      // Extract the breed from the URL for a nicer title
      // URL format: https://images.dog.ceo/breeds/breed-name/image.jpg
      const breedMatch = dogUrl.match(/breeds\/([^/]+)\//);
      const breed = breedMatch
        ? breedMatch[1].replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Dog';

      const embed = new EmbedBuilder()
        .setTitle(`🐶 Random Dog — ${breed}`)
        .setImage(dogUrl)
        .setColor('#5865F2')
        .setFooter({ text: 'Powered by dog.ceo' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      // Handle API errors gracefully
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Could not fetch a dog image right now. Try again later!')
        .setColor('#F00000');

      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  },
};
