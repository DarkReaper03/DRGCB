const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Fetches a random meme from Reddit 😂'),

  async execute(interaction) {
    try {
      // Fetch a random meme from the meme-api
      const response = await axios.get('https://meme-api.com/gimme');
      const meme = response.data;

      // Reject NSFW memes just in case
      if (meme.nsfw) {
        return interaction.reply({
          content: 'The meme fetched was marked NSFW. Please try again!',
          flags: MessageFlags.Ephemeral,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(meme.title)
        .setURL(meme.postLink)
        .setImage(meme.url)
        .setColor('#5865F2')
        .setFooter({ text: `📌 r/${meme.subreddit}  •  👍 ${meme.ups.toLocaleString()} upvotes` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      // Handle API errors gracefully
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Could not fetch a meme right now. Try again later!')
        .setColor('#F00000');

      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  },
};
