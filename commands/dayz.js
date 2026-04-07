// =============================================
// Command: /dayz
// Manage DayZ server status embeds via commands.
// Subcommands:
//   add     — add a server to watch (owner only)
//   remove  — remove a server (owner only)
//   list    — list all watched servers
//   refresh — force-update a server's embed now (owner only)
// =============================================

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { loadServers, saveServers, updateServerEmbed } = require('../modules/dayzWatcher.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dayz')
		.setDescription('Manage DayZ server status embeds.')
		.addSubcommand(sub =>
			sub.setName('add')
				.setDescription('Add a DayZ server to watch. (Owner only)')
				.addStringOption(o =>
					o.setName('name')
						.setDescription('Display name for this server.')
						.setRequired(true),
				)
				.addStringOption(o =>
					o.setName('ip')
						.setDescription('Server IP address.')
						.setRequired(true),
				)
				.addIntegerOption(o =>
					o.setName('port')
						.setDescription('Server query port (default DayZ: 27016).')
						.setRequired(true),
				)
				.addChannelOption(o =>
					o.setName('channel')
						.setDescription('Channel to post the status embed in.')
						.setRequired(true),
				),
		)
		.addSubcommand(sub =>
			sub.setName('remove')
				.setDescription('Remove a watched DayZ server. (Owner only)')
				.addStringOption(o =>
					o.setName('name')
						.setDescription('Server to remove.')
						.setRequired(true)
						.setAutocomplete(true),
				),
		)
		.addSubcommand(sub =>
			sub.setName('list')
				.setDescription('List all watched DayZ servers.'),
		)
		.addSubcommand(sub =>
			sub.setName('refresh')
				.setDescription('Force-update a server\'s embed right now. (Owner only)')
				.addStringOption(o =>
					o.setName('name')
						.setDescription('Server to refresh.')
						.setRequired(true)
						.setAutocomplete(true),
				),
		),

	// Autocomplete server names from servers.json
	async autocomplete(interaction) {
		const focused = interaction.options.getFocused();
		const servers = loadServers();
		const matches = servers
			.filter(s => s.name.toLowerCase().startsWith(focused.toLowerCase()))
			.map(s => ({ name: s.name, value: s.name }));
		await interaction.respond(matches.slice(0, 25));
	},

	async execute(interaction) {
		const sub = interaction.options.getSubcommand();

		// Owner-only guard for modifying commands
		const isOwner = interaction.user.id === process.env.OWNER_ID;
		if (['add', 'remove', 'refresh'].includes(sub) && !isOwner) {
			return interaction.reply({ content: 'Only the bot owner can manage DayZ servers.', flags: MessageFlags.Ephemeral });
		}

		// --- add ---
		if (sub === 'add') {
			const name    = interaction.options.getString('name');
			const ip      = interaction.options.getString('ip');
			const port    = interaction.options.getInteger('port');
			const channel = interaction.options.getChannel('channel');

			const servers = loadServers();

			if (servers.find(s => s.name === name)) {
				return interaction.reply({ content: `A server named **"${name}"** already exists.`, flags: MessageFlags.Ephemeral });
			}

			// Add the new entry — messageId starts null so watcher posts a fresh embed
			servers.push({ name, ip, port, channelId: channel.id, messageId: null });
			saveServers(servers);

			await interaction.reply({ content: `✅ Added **${name}** (\`${ip}:${port}\`) → ${channel}. The embed will appear within 60 seconds.`, flags: MessageFlags.Ephemeral });
		}

		// --- remove ---
		else if (sub === 'remove') {
			const name = interaction.options.getString('name');
			const servers = loadServers();
			const index = servers.findIndex(s => s.name === name);

			if (index === -1) {
				return interaction.reply({ content: `No server named **"${name}"** found.`, flags: MessageFlags.Ephemeral });
			}

			servers.splice(index, 1);
			saveServers(servers);

			await interaction.reply({ content: `✅ Removed **${name}** from the watch list. The embed in its channel will no longer update.`, flags: MessageFlags.Ephemeral });
		}

		// --- list ---
		else if (sub === 'list') {
			const servers = loadServers();

			if (!servers.length) {
				return interaction.reply({ content: 'No DayZ servers being watched. Use `/dayz add` to add one.', flags: MessageFlags.Ephemeral });
			}

			const lines = servers.map(s =>
				`**${s.name}** — \`${s.ip}:${s.port}\` → <#${s.channelId}>`,
			).join('\n');

			await interaction.reply({ content: `**Watched DayZ Servers:**\n${lines}`, flags: MessageFlags.Ephemeral });
		}

		// --- refresh ---
		else if (sub === 'refresh') {
			const name = interaction.options.getString('name');
			const servers = loadServers();
			const server = servers.find(s => s.name === name);

			if (!server) {
				return interaction.reply({ content: `No server named **"${name}"** found.`, flags: MessageFlags.Ephemeral });
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			try {
				await updateServerEmbed(interaction.client, server);
				await interaction.editReply(`✅ **${name}** embed refreshed.`);
			} catch (err) {
				await interaction.editReply(`Failed to refresh: ${err.message}`);
			}
		}
	},
};
