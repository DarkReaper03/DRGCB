const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Fetches a random clean joke 😄'),

  async execute(interaction) {
    try {
      // Fetch a joke — blacklist NSFW, racist, and sexist flags
      const response = await axios.get(
        'https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist'
      );
      const joke = response.data;

      let description;

      if (joke.type === 'single') {
        // Single-line joke
        description = joke.joke;
      } else if (joke.type === 'twopart') {
        // Setup + punchline — hide the punchline with a spoiler tag for extra fun
        description = `**${joke.setup}**\n\n||${joke.delivery}||`;
      } else {
        description = 'Could not parse this joke. Try again!';
      }

      const embed = new EmbedBuilder()
        .setTitle('😄 Random Joke')
        .setDescription(description)
        .setColor('#5865F2')
        .setFooter({ text: `Category: ${joke.category}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      // Handle API errors gracefully
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Could not fetch a joke right now. Try again later!')
        .setColor('#F00000');

      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  },
};
