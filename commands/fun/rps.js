const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Maps each choice to what it beats
const BEATS = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

// Emojis for each choice
const EMOJIS = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play Rock Paper Scissors against the bot ✂️')
    .addStringOption(option =>
      option
        .setName('choice')
        .setDescription('Your choice')
        .setRequired(true)
        .addChoices(
          { name: '🪨 Rock', value: 'rock' },
          { name: '📄 Paper', value: 'paper' },
          { name: '✂️ Scissors', value: 'scissors' }
        )
    ),

  async execute(interaction) {
    const playerChoice = interaction.options.getString('choice');

    // Bot picks a random choice
    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    // Determine the result
    let result, color, resultText;

    if (playerChoice === botChoice) {
      result = 'Draw!';
      color = '#5865F2';
      resultText = "It's a tie!";
    } else if (BEATS[playerChoice] === botChoice) {
      result = 'You Win!';
      color = '#00B000';
      resultText = `${EMOJIS[playerChoice]} beats ${EMOJIS[botChoice]}!`;
    } else {
      result = 'You Lose!';
      color = '#F00000';
      resultText = `${EMOJIS[botChoice]} beats ${EMOJIS[playerChoice]}!`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`✂️ Rock Paper Scissors — ${result}`)
      .addFields(
        { name: 'Your Choice', value: `${EMOJIS[playerChoice]} ${playerChoice}`, inline: true },
        { name: "Bot's Choice", value: `${EMOJIS[botChoice]} ${botChoice}`, inline: true },
        { name: 'Result', value: resultText }
      )
      .setColor(color)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
