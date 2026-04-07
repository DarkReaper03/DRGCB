const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const weather = require('weather-js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Get the current weather for a location 🌤️')
    .addStringOption(option =>
      option
        .setName('location')
        .setDescription('City or location to look up (e.g. "London", "New York, US")')
        .setRequired(true)
    ),

  async execute(interaction) {
    const location = interaction.options.getString('location');

    // Defer since weather-js is async and might take a moment
    await interaction.deferReply();

    // Wrap the callback-based weather-js in a promise
    const searchWeather = () =>
      new Promise((resolve, reject) => {
        weather.find({ search: location, degreeType: 'F' }, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });

    let results;
    try {
      results = await searchWeather();
    } catch (err) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Something went wrong fetching weather data. Try again later!')
        .setColor('#F00000');
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    // Handle location not found
    if (!results || results.length === 0) {
      const notFoundEmbed = new EmbedBuilder()
        .setTitle('Location Not Found')
        .setDescription(`Could not find weather data for **${location}**. Try a different location.`)
        .setColor('#F00000');
      return interaction.editReply({ embeds: [notFoundEmbed] });
    }

    const data = results[0];
    const current = data.current;
    const location_name = data.location.name;

    // Convert °F to °C
    const tempF = parseFloat(current.temperature);
    const tempC = ((tempF - 32) * 5 / 9).toFixed(1);

    // Convert wind speed from mph string if present
    const windText = current.winds || 'N/A';

    const embed = new EmbedBuilder()
      .setTitle(`🌤️ Weather — ${location_name}`)
      .addFields(
        { name: '🌡️ Temperature', value: `${tempF}°F / ${tempC}°C`, inline: true },
        { name: '☁️ Conditions', value: current.skytext || 'N/A', inline: true },
        { name: '💧 Humidity', value: `${current.humidity || 'N/A'}%`, inline: true },
        { name: '💨 Wind', value: windText, inline: true },
        { name: '👁️ Feels Like', value: current.feelslike ? `${current.feelslike}°F` : 'N/A', inline: true },
        { name: '📅 Observed', value: current.observationtime || 'N/A', inline: true },
      )
      .setColor('#5865F2')
      .setFooter({ text: 'Powered by weather-js (MSN Weather)' })
      .setTimestamp();

    // Attach weather icon if available
    if (current.imageUrl) embed.setThumbnail(current.imageUrl);

    await interaction.editReply({ embeds: [embed] });
  },
};
