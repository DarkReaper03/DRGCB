const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll a dice 🎲')
    .addIntegerOption(option =>
      option
        .setName('sides')
        .setDescription('Number of sides on the dice (default: 6, min: 2, max: 100)')
        .setMinValue(2)
        .setMaxValue(100)
        .setRequired(false)
    ),

  async execute(interaction) {
    // Use provided sides value or fall back to standard d6
    const sides = interaction.options.getInteger('sides') ?? 6;

    // Roll: random integer between 1 and sides (inclusive)
    const result = Math.floor(Math.random() * sides) + 1;

    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Roll')
      .setDescription(`You rolled a **d${sides}** and got... **${result}**!`)
      .setColor('#5865F2')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
