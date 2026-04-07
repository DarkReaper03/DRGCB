// =============================================
// Command: /waifu
// Fetches a random image from waifu.im
// NSFW option sends result as ephemeral
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { request } = require('undici');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('waifu')
		.setDescription('Display a random waifu picture.')
		.addBooleanOption(option =>
			option.setName('nsfw')
				.setDescription('Search NSFW? (Result will be shown only to you)'),
		),

	async execute(interaction) {
		const isNsfw = interaction.options.getBoolean('nsfw') ?? false;
		await interaction.deferReply({ flags: isNsfw ? MessageFlags.Ephemeral : undefined });

		const query = new URLSearchParams({ is_nsfw: isNsfw });
		const result = await request(`https://api.waifu.im/search?${query}`);
		const body = await result.body.json();

		// Log the response shape if images is missing so we can see what changed
		if (!body?.images?.length) {
			console.error('[waifu] Unexpected API response:', JSON.stringify(body));
			return interaction.editReply('Could not fetch a waifu image right now. Try again later.');
		}

		const image = body.images[0];
		await interaction.editReply({ content: 'Here is your random waifu!', files: [image.url] });
	},
};
