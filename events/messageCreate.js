// =============================================
// Event: MessageCreate
// 1. XP system — award XP per message (60s cooldown)
//    Level-up DM when a new level is reached.
// 2. Phishing scanner — delete bad links, warn/kick/ban.
//    (Ported from DC Link Watcher eris bot)
// NOTE: Requires MessageContent privileged intent
// =============================================

const { Events, PermissionFlagsBits } = require('discord.js');
const { validate_message } = require('../modules/linkWatcher.js');
const { users, guilds, saveAll } = require('../modules/linkWatcherState.js');
const db = require('../database.js');

// ---- XP System Config ----
const XP_MIN = 15;
const XP_MAX = 40;
const XP_COOLDOWN_MS = 60_000; // 60s between XP gains per user

// Per-user cooldown map (in-memory, resets on restart — that's fine)
const xpCooldowns = new Map();

// XP required to reach a given level: 100 * level^1.5
function xpForLevel(level) {
	return Math.floor(100 * Math.pow(level, 1.5));
}

async function handleXP(message) {
	if (!message.guild || message.author.bot) return;

	// Respect cooldown
	const key = `${message.author.id}:${message.guildId}`;
	const last = xpCooldowns.get(key) ?? 0;
	if (Date.now() - last < XP_COOLDOWN_MS) return;
	xpCooldowns.set(key, Date.now());

	// Get or create user record
	const [user] = await db.User.findOrCreate({
		where: { userId: message.author.id, guildId: message.guildId },
		defaults: { xp: 0, level: 0 },
	});

	const gained = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
	const newXp = user.xp + gained;
	let newLevel = user.level;

	// Check for level-up(s)
	while (newXp >= xpForLevel(newLevel + 1)) {
		newLevel++;
	}

	await user.update({ xp: newXp, level: newLevel });

	// Announce level-up in the message channel
	if (newLevel > user.level) {
		await message.channel.send(
			`🎉 ${message.author} levelled up to **Level ${newLevel}**!`,
		).catch(() => {});
	}
}

// How long before a user's warnings reset (24 hours)
const PARDON_DURATION = 1000 * 3600 * 24;

// Action constants
const NO_ACTION = 0;
const ACTION_BAN = 1;
const ACTION_KICK = 2;

async function analyzeMessage(message) {
	// Only check messages in servers
	if (!message.guild) return;

	// Ignore bot messages
	if (message.author.bot) return;

	// Award XP (runs independently — don't let errors here block phishing scan)
	handleXP(message).catch(err => console.error('[XP] Error:', err.message));

	// Ignore users who can manage messages (mods/admins)
	if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;

	// Check message content for phishing links
	const [isBad, reason] = await validate_message(message.content);
	if (!isBad) return;

	console.log(`[LinkWatcher] Phishing detected in ${message.guild.name}: ${reason}`);

	// --- Track user warnings ---
	let userData = users.get(message.author.id);

	if (userData) {
		// Reset warnings if pardon period has passed
		if (Date.now() - userData.last_warning >= PARDON_DURATION) {
			userData.warns = 1;
		} else {
			userData.warns++;
		}
		userData.last_warning = Date.now();
	} else {
		userData = { warns: 1, last_warning: Date.now() };
		users.set(message.author.id, userData);
	}

	// Get guild-specific settings (default: kick after 4 warnings)
	let guildSettings = guilds.get(message.guild.id);
	if (!guildSettings) {
		guildSettings = { notify_channel: null, max_warnings: 4, action: ACTION_KICK };
		guilds.set(message.guild.id, guildSettings);
	}

	// --- Delete the phishing message ---
	let deleteOk = true;
	try {
		await message.delete();
	} catch (err) {
		console.error('[LinkWatcher] Failed to delete message:', err.message);
		deleteOk = false;
	}

	// --- Take action if warn limit hit ---
	let actionTaken = NO_ACTION;
	let actionError = null;

	if (userData.warns >= guildSettings.max_warnings) {
		try {
			if (guildSettings.action === ACTION_BAN) {
				await message.guild.members.ban(message.author.id, {
					deleteMessageSeconds: 86400, // Delete last 24h of messages
					reason: `Phishing link: ${reason}`,
				});
				actionTaken = ACTION_BAN;
			} else if (guildSettings.action === ACTION_KICK) {
				const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
				if (!member) throw new Error('Member not found — cannot kick');
				await member.kick(`Phishing link: ${reason}`);
				actionTaken = ACTION_KICK;
			}
		} catch (err) {
			console.error('[LinkWatcher] Failed to take action:', err.message);
			actionError = err;
		}
	}

	// --- DM the offending user ---
	let dmOk = true;
	try {
		const dm = await message.author.createDM();
		await dm.send(
			`Your message in **${message.guild.name}** was removed — it contains a link associated with phishing!\n` +
			`If this was a mistake, contact a moderator.\n\n` +
			`Warnings: \`${userData.warns}/${guildSettings.max_warnings}\` (resets in 24h)\n`,
		);
	} catch {
		dmOk = false; // User may have DMs disabled — that's fine
	}

	// --- Log to notify channel if configured ---
	if (guildSettings.notify_channel) {
		try {
			const notifyChannel = await message.guild.channels.fetch(guildSettings.notify_channel);
			if (!notifyChannel) return;

			const actionLine =
				actionTaken === ACTION_BAN ? `ban (${actionError ? '**ERROR**: ' + actionError.message : 'OK'})` :
				actionTaken === ACTION_KICK ? `kick (${actionError ? '**ERROR**: ' + actionError.message : 'OK'})` :
				'none';

			await notifyChannel.send({
				content:
					`**Phishing link detected**\n` +
					`User: \`${message.author.tag}\` (\`${message.author.id}\`)\n` +
					`Reason: \`${reason}\`\n` +
					`Warnings: \`${userData.warns}/${guildSettings.max_warnings}\`\n` +
					`Actions: delete (${deleteOk ? 'OK' : 'ERROR'}), DM (${dmOk ? 'OK' : 'skipped'}), ${actionLine}`,
				allowedMentions: { everyone: false, roles: false, users: false },
			});
		} catch (err) {
			console.error('[LinkWatcher] Failed to send to notify channel:', err.message);
		}
	}

	// Persist updated warning data
	saveAll();
}

module.exports = {
	name: Events.MessageCreate,
	execute: analyzeMessage,
};
