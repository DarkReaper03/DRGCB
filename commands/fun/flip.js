const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('flip')
    .setDescription('Flip a coin 🪙'),

  async execute(interaction) {
    // 50/50 coin flip
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '🌕' : '🌑';

    const embed = new EmbedBuilder()
      .setTitle('🪙 Coin Flip')
      .setDescription(`${emoji} **${result}!**`)
      .setColor('#5865F2')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
