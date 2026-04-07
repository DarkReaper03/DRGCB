const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const translate = require('@iamtraction/google-translate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text to another language 🌐')
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('The text you want to translate')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('language')
        .setDescription('Target language code (e.g. es, fr, de, ja, zh, ar)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const text = interaction.options.getString('text');
    const targetLang = interaction.options.getString('language').toLowerCase().trim();

    // Defer since translate might take a moment
    await interaction.deferReply();

    let result;
    try {
      result = await translate(text, { to: targetLang });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Translation Error')
        .setDescription(
          `Could not translate to **${targetLang}**. Make sure it's a valid language code (e.g. \`es\`, \`fr\`, \`de\`, \`ja\`).`
        )
        .setColor('#F00000');

      return interaction.editReply({ embeds: [errorEmbed] });
    }

    const embed = new EmbedBuilder()
      .setTitle('🌐 Translation')
      .addFields(
        { name: `Original (${result.from.language.iso || 'auto-detected'})`, value: text },
        { name: `Translated (${targetLang})`, value: result.text }
      )
      .setColor('#5865F2')
      .setFooter({ text: 'Powered by Google Translate' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
