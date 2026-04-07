// =============================================
// Unified Bot — Shared SQLite Database
// Tables: Nitrado servers, DayZ tracking,
// Economy/XP users, Warnings, Tickets
// =============================================

const path = require('node:path');
const Sequelize = require('sequelize');

const db = {};
db.Sequelize = Sequelize;

// DB file location per platform
let dbPath;
if (process.platform === 'linux') {
	dbPath = path.join('/home/container/', 'unifiedbot', 'unifiedbot.sqlite');
} else if (process.platform === 'win32') {
	dbPath = path.join(process.env.APPDATA, 'unifiedbot', 'unifiedbot.sqlite');
} else {
	dbPath = path.join('.', 'unifiedbot', 'unifiedbot.sqlite');
}

const sequelize = new Sequelize({ dialect: 'sqlite', logging: false, storage: dbPath });
db.sequelize = sequelize;

// --- Nitrado Servers ---
db.Server = sequelize.define('server', {
	id: { type: Sequelize.INTEGER, unique: true, autoIncrement: false, primaryKey: true },
	displayname: { type: Sequelize.STRING(25), unique: true, defaultValue: 'Nameless Server', allowNull: false },
	nitradotoken: { type: Sequelize.STRING(100), defaultValue: 'no-token', allowNull: false },
	installedGames: { type: Sequelize.STRING(), defaultValue: 'unknown', allowNull: true },
	activeGame: { type: Sequelize.STRING(100), defaultValue: 'unknown', allowNull: true },
});

// --- Nitrado Pinned Embeds ---
db.ServerInfoCron = sequelize.define('serverInfoCron', {
	messageId: { type: Sequelize.STRING(20), unique: true, primaryKey: true },
	channelId: { type: Sequelize.STRING(20) },
	servername: { type: Sequelize.STRING(25), unique: true, defaultValue: 'none', allowNull: false },
});

// --- Economy + XP/Level Users ---
// One row per user per guild
db.User = sequelize.define('user', {
	userId: { type: Sequelize.STRING(20), allowNull: false },
	guildId: { type: Sequelize.STRING(20), allowNull: false },
	wallet: { type: Sequelize.INTEGER, defaultValue: 0 },
	bank: { type: Sequelize.INTEGER, defaultValue: 0 },
	xp: { type: Sequelize.INTEGER, defaultValue: 0 },
	level: { type: Sequelize.INTEGER, defaultValue: 0 },
	lastDaily: { type: Sequelize.BIGINT, defaultValue: 0 },
	lastWork: { type: Sequelize.BIGINT, defaultValue: 0 },
	lastBeg: { type: Sequelize.BIGINT, defaultValue: 0 },
});
// Compound unique — one entry per user per guild
db.User.addHook('afterSync', async () => {
	await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS user_guild ON users (userId, guildId)').catch(() => {});
});

// --- Moderation Warnings ---
db.Warning = sequelize.define('warning', {
	caseId: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
	userId: { type: Sequelize.STRING(20), allowNull: false },
	guildId: { type: Sequelize.STRING(20), allowNull: false },
	reason: { type: Sequelize.TEXT, defaultValue: 'No reason provided' },
	moderatorId: { type: Sequelize.STRING(20), allowNull: false },
});

// --- Support Tickets ---
db.Ticket = sequelize.define('ticket', {
	ticketId: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
	userId: { type: Sequelize.STRING(20), allowNull: false },
	guildId: { type: Sequelize.STRING(20), allowNull: false },
	channelId: { type: Sequelize.STRING(20), allowNull: false, unique: true },
	status: { type: Sequelize.STRING(10), defaultValue: 'open' }, // open, closed
	claimedBy: { type: Sequelize.STRING(20), allowNull: true, defaultValue: null },
});

module.exports = db;
