# DRTB — Unified Discord Bot

A multipurpose Discord bot built on **Node.js** and **Discord.js v14**, powered by **Lavalink v4** for music with **Spotify**, **YouTube**, and **SoundCloud** support — alongside economy, moderation, levelling, giveaways, tickets, DayZ server monitoring, and Nitrado game server management.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Discord Library | Discord.js v14 |
| Music Backend | Lavalink v4 + lavalink-client v2 |
| Spotify Support | lavasrc-plugin 4.8.1 |
| YouTube Support | youtube-plugin 1.18.0 |
| Database | Sequelize + SQLite3 |
| Giveaways | discord-giveaways |
| Game Server API | Nitrado REST API |

---

## Prerequisites

- **Node.js** v18 or higher
- A **Lavalink v4** server (self-hosted or remote)
  - With `lavasrc-plugin` for Spotify support
  - With `youtube-plugin` for YouTube support
- A **Discord application** with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- A **Spotify Developer app** for Spotify playback (Client ID + Secret)

---

## Setup & Installation

### 1. Clone the repo

```bash
git clone https://github.com/DarkReaper03/DRGCB.git
cd DRGCB
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in every value:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from the Discord Developer Portal |
| `CLIENT_ID` | Your bot's application/client ID |
| `OWNER_ID` | Your personal Discord user ID |
| `GUILD_IDS` | Comma-separated guild IDs for slash command registration |
| `PRIVATE_GUILD_ID` | Guild ID for owner-only commands |
| `WEBHOOK_URL` | Webhook URL used by `/hiddenmsg` |
| `LAVALINK_HOST` | Hostname or IP of your Lavalink server |
| `LAVALINK_PORT` | Lavalink port (default: `4001`) |
| `LAVALINK_PASSWORD` | Lavalink server password |
| `LAVALINK_SECURE` | `true` if Lavalink is behind HTTPS, otherwise `false` |

### 4. Start the bot

```bash
npm start
```

Slash commands are deployed automatically on startup. If no commands have changed since the last run, deployment is skipped.

---

## Lavalink Setup

Your `application.yml` on the Lavalink server should include:

```yaml
lavalink:
  plugins:
    - dependency: com.github.topi314.lavasrc:lavasrc-plugin:4.8.1
      repository: https://maven.topi.wtf/releases
    - dependency: dev.lavalink.youtube:youtube-plugin:1.18.0
      snapshot: false

plugins:
  lavasrc:
    providers:
      - "scsearch:%QUERY%"
      - 'ytsearch:"%ISRC%"'
      - "ytsearch:%QUERY%"
      - 'ytmsearch:"%ISRC%"'
      - "ytmsearch:%QUERY%"
    sources:
      spotify: true
      soundcloud: true
    spotify:
      clientId: "YOUR_SPOTIFY_CLIENT_ID"
      clientSecret: "YOUR_SPOTIFY_CLIENT_SECRET"
      countryCode: "US"
  youtube:
    enabled: true
    clients:
      - TV
      - MUSIC
      - IOS
      - ANDROID_MUSIC
    oauth:
      enabled: true
      skipInitialization: false
```

---

## Commands

### 🎵 Music

| Command | Description |
|---|---|
| `/play <query> [source]` | Play a song or playlist. Accepts Spotify URLs, YouTube URLs, or plain text search. |
| `/pause` | Pause the current track. |
| `/resume` | Resume a paused track. |
| `/skip` | Skip the current track. |
| `/stop` | Stop playback, clear the queue, and leave the voice channel. |
| `/queue [page]` | View the current music queue (paginated). |
| `/nowplaying` | Show the currently playing track with a progress bar. |
| `/volume [level]` | Set the volume (0–100). Omit to see the current level. |
| `/shuffle` | Shuffle the remaining tracks in the queue. |
| `/loop [mode]` | Set loop mode: `off`, `track`, or `queue`. |
| `/random` | Queue a random song from the built-in song pool. |
| `/autoplay` | Toggle autoplay — automatically queues a random song when the queue runs out. |

---

### 💰 Economy

| Command | Description |
|---|---|
| `/balance [user]` | Check your coin balance (wallet + bank). |
| `/daily` | Claim your daily 500 coins (24h cooldown). |
| `/work` | Work for 150–400 coins (1h cooldown). |
| `/beg` | Beg for 10–100 coins (30s cooldown). |
| `/transfer <user> <amount>` | Send coins from your wallet to another user. |
| `/slots <bet>` | Spin the slot machine. Minimum bet: 10 coins. |
| `/blackjack <bet>` | Play blackjack against the dealer. Minimum bet: 10 coins. |
| `/roulette <bet> <choice>` | Bet on red, black, or a number (0–36). Minimum bet: 10 coins. |

---

### ⭐ Levels

| Command | Description |
|---|---|
| `/rank [user]` | View your (or another user's) XP rank card. |
| `/leaderboard` | View the top 10 users by XP in the server. |

---

### 🛡️ Moderation

Requires the appropriate Discord permissions.

| Command | Description |
|---|---|
| `/ban <member> [reason]` | Ban a member from the server. |
| `/kick <member> [reason]` | Kick a member from the server. |
| `/unban <userid>` | Unban a user by their Discord ID. |
| `/warn <member> <reason>` | Issue a warning to a member. |
| `/warnings <user>` | View all warnings for a user. |
| `/clearwarnings <user>` | Clear all warnings for a user. |
| `/disconnect <member>` | Disconnect a member from their voice channel. |
| `/linkwatcher get-settings` | Show current phishing link watcher settings. |
| `/linkwatcher set-max-warnings <amount>` | Set how many warnings before action is taken. |
| `/linkwatcher set-action <action-type>` | Set the action taken when warnings run out (`none`, `kick`, `ban`). |
| `/linkwatcher set-notify-channel <channel>` | Set the channel where phishing detections are logged. |

---

### 🎉 Giveaways

Requires **Manage Guild** permission.

| Command | Description |
|---|---|
| `/giveaway start <duration> <winners> <prize> [channel]` | Start a new giveaway. Duration format: `1h`, `30m`, `1d`. |
| `/giveaway end <message_id>` | End a giveaway early. |
| `/giveaway reroll <message_id>` | Reroll winners for a finished giveaway. |

---

### 🎫 Tickets

| Command | Description |
|---|---|
| `/ticket setup <channel>` | Post the ticket panel in a channel. Requires **Manage Channels**. |
| `/ticket open [reason]` | Open a support ticket. |

---

### 🕹️ DayZ Server Monitor

| Command | Description |
|---|---|
| `/dayz add <name> <ip> <port> <channel>` | Add a DayZ server to watch. Posts a live status embed. |
| `/dayz remove <name>` | Remove a watched DayZ server. |
| `/dayz list` | List all currently watched DayZ servers. |
| `/dayz refresh <name>` | Force-refresh a server's status embed immediately. |

---

### 🖥️ Nitrado Game Servers

| Command | Description |
|---|---|
| `/server import <serverid> <server-name> <nitrado-token>` | Add a Nitrado server to the bot. |
| `/server delete <server-name>` | Remove a server from the database. |
| `/server list` | List all saved Nitrado servers. |
| `/server info <server-name> [pin-message]` | Show live server status. Optionally pin and auto-update every minute. |
| `/server start <server-name>` | Start a server. |
| `/server stop <server-name>` | Stop a server. |
| `/server restart <server-name>` | Restart a server. |
| `/server switch <server-name> <game>` | Switch the active game on a server. |
| `/server unpin <server-name>` | Stop auto-updating and unpin a server info message. |

---

### 🎲 Fun

| Command | Description |
|---|---|
| `/8ball <question>` | Ask the Magic 8-Ball a question. |
| `/cat` | Fetch a random cat image. |
| `/dog` | Fetch a random dog image. |
| `/flip` | Flip a coin. |
| `/dice [sides]` | Roll a dice (default 6 sides, max 100). |
| `/joke` | Fetch a random clean joke. |
| `/meme` | Fetch a random meme from Reddit. |
| `/rps <choice>` | Play Rock Paper Scissors against the bot. |
| `/trivia` | Answer a random hard trivia question (30s timer, button choices). |
| `/waifu [nsfw]` | Display a random waifu image. |

---

### 🔧 Utility

| Command | Description |
|---|---|
| `/userinfo [user]` | Get info about a user. |
| `/channelinfo [channel]` | Get info about a channel. |
| `/roleinfo <role>` | Get info about a role. |
| `/weather <location>` | Get the current weather for a city or location. |
| `/translate <text> <language>` | Translate text to another language (e.g. `es`, `fr`, `ja`). |
| `/google <query>` | Generate a Google search link. |
| `/youtube <query>` | Search YouTube for a video. |
| `/calculator` | Open an interactive button-based calculator. |
| `/whoami` | Shows your username and when you joined the server. |
| `/whereami` | Shows the current server name and member count. |

---

### ⚙️ Bot

| Command | Description |
|---|---|
| `/bot ping` | Shows bot latency and WebSocket latency. |
| `/bot restart` | Kills the bot process — use with PM2 for auto-restart. (Owner only) |
| `/help` | Lists all available commands organized by category. |

---

## Running with PM2 (Recommended for 24/7)

```bash
npm install -g pm2
pm2 start index.js --name "DRGCB"
pm2 save
pm2 startup
```

This keeps the bot alive after crashes and reboots.

---

## Project Structure

```
├── commands/
│   ├── economy/       # Balance, daily, gambling
│   ├── fun/           # Games and random stuff
│   ├── giveaway/      # Giveaway management
│   ├── levels/        # XP rank cards and leaderboard
│   ├── moderation/    # Ban, kick, warn, link watcher
│   ├── music/         # Full music system
│   ├── tickets/       # Support ticket system
│   └── utility/       # Info, weather, translate, etc.
├── data/
│   ├── songPool.js    # Song pool for /random and autoplay
│   └── giveaways.json # Giveaway persistence
├── events/
│   ├── ready.js       # Bot init, Lavalink setup, player events
│   ├── interactionCreate.js
│   └── messageCreate.js
├── modules/           # DayZ watcher, link watcher, ticket handler
├── database.js        # Sequelize models
├── index.js           # Entry point
└── .env               # Your secrets — never commit this
```
