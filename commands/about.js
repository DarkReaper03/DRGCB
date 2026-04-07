// =============================================
// Command: /about
// Shows who built the bot and what it was made with
// =============================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('about')
		.setDescription('Find out who built this bot and what it was made with.'),

	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setTitle('About DRTB')
			.setColor(0x5865F2)
			.setThumbnail(interaction.client.user.displayAvatarURL())
			.setDescription('A multipurpose Discord bot built for fun, music, and server management.')
			.addFields(
				{
					name: '👨‍💻 Built By',
					value: '**darkreaper5524**',
					inline: true,
				},
				{
					name: '🤖 Bot',
					value: `**${interaction.client.user.tag}**`,
					inline: true,
				},
				{
					name: '📡 Servers',
					value: `**${interaction.client.guilds.cache.size}**`,
					inline: true,
				},
				{
					name: '🛠️ Built With',
					value: [
						'**Discord.js** v14',
						'**Lavalink** v4 — music backend',
						'**LavaSrc** — Spotify support',
						'**SoundCloud** — audio fallback',
						'**Sequelize** + SQLite — database',
						'**Node.js** — runtime',
					].join('\n'),
					inline: false,
				},
			)
			.setFooter({ text: 'Made with ❤️ by darkreaper5524' })
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};
