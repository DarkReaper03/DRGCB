const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Classic magic 8-ball responses — 20 total
const RESPONSES = [
  // Positive
  'It is certain.',
  'It is decidedly so.',
  'Without a doubt.',
  'Yes, definitely.',
  'You may rely on it.',
  'As I see it, yes.',
  'Most likely.',
  'Outlook good.',
  'Yes.',
  'Signs point to yes.',
  // Neutral
  'Reply hazy, try again.',
  'Ask again later.',
  'Better not tell you now.',
  'Cannot predict now.',
  'Concentrate and ask again.',
  // Negative
  "Don't count on it.",
  'My reply is no.',
  'My sources say no.',
  'Outlook not so good.',
  'Very doubtful.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the Magic 8-Ball a question 🎱')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('What do you want to ask the 8-ball?')
        .setRequired(true)
    ),

  async execute(interaction) {
    const question = interaction.options.getString('question');

    // Pick a random response from the list
    const answer = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

    const embed = new EmbedBuilder()
      .setTitle('🎱 Magic 8-Ball')
      .addFields(
        { name: 'Question', value: question },
        { name: 'Answer', value: answer }
      )
      .setColor('#5865F2')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
