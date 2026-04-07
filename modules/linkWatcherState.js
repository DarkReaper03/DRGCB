// =============================================
// Module: linkWatcherState
// Shared in-memory state for the link watcher.
// Both messageCreate.js and linkwatcher.js command
// import this module and get the SAME Map objects
// (Node.js caches modules, so the reference is shared)
// =============================================

const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GUILDS_FILE = path.join(DATA_DIR, 'guilds.json');

// Ensure data directory exists before any read/write
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Load existing data from disk, or start empty
const users = fs.existsSync(USERS_FILE)
	? new Map(JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')))
	: new Map();

const guilds = fs.existsSync(GUILDS_FILE)
	? new Map(JSON.parse(fs.readFileSync(GUILDS_FILE, 'utf8')))
	: new Map();

// Save both maps to disk
function saveAll() {
	fs.writeFileSync(USERS_FILE, JSON.stringify([...users]), 'utf8');
	fs.writeFileSync(GUILDS_FILE, JSON.stringify([...guilds]), 'utf8');
}

// Auto-save every hour
setInterval(saveAll, 1000 * 3600);

// Save on clean exit
process.on('exit', saveAll);
process.on('SIGINT', () => {
	saveAll();
	process.exit(0);
});

module.exports = { users, guilds, saveAll };
