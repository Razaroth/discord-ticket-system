# 🔧 Discord Repair Ticket Bot

A full-featured Phone & Computer Repair ticketing system for Discord, built with **discord.js v14**.

---

## Features

- 🎫 **Ticket panel** — customers open tickets with a single button click
- 📱💻 **Device type selection** — Phone or Computer, with guided 3-step flow
- ⚡ **Priority levels** — Low, Medium, High, Urgent (color-coded embeds)
- 🔒 **Private channels** — each ticket gets its own channel, visible only to the customer and staff
- 👤 **Technician assignment** — staff can claim or assign tickets
- 📋 **Status tracking** — Open → In Progress → Closed
- 📅 **Due date tracking** — set and update repair deadlines
- 📝 **Staff controls** — all actions available via buttons on the ticket embed
- 📊 **Ticket overview** — `/tickets` lists all active tickets at a glance
- 📣 **Log channel** — optional logging of ticket closures

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A Discord application & bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

### Required Bot Permissions

When inviting the bot, grant these permissions:
- **Manage Channels** — creates and renames ticket channels
- **View Channels / Send Messages / Read Message History / Embed Links** — standard messaging
- **Manage Messages** — staff pin/delete in ticket channels
- **Manage Roles** — sets per-channel permission overrides

### Discord Developer Portal Settings

1. Under **Bot**, enable **Server Members Intent** (needed to read member roles)
2. Under **OAuth2 → URL Generator**, select scopes: `bot` + `applications.commands`

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill it in:

```
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
```

### 3. Configure `config.json`

Open `config.json` and fill in your server's IDs:

```json
{
  "guildId":           "YOUR_SERVER_ID",
  "staffRoleId":       "YOUR_STAFF_ROLE_ID",
  "ticketsCategoryId": "OPTIONAL_CATEGORY_ID",
  "logChannelId":      "OPTIONAL_LOG_CHANNEL_ID"
}
```

| Field | Required | Description |
|---|---|---|
| `guildId` | ✅ | Your Discord server ID |
| `staffRoleId` | Recommended | Role that can see and manage all tickets |
| `ticketsCategoryId` | Optional | Category where ticket channels are created |
| `logChannelId` | Optional | Channel where ticket closures are logged |

> **Tip:** Enable Developer Mode in Discord settings (User Settings → Advanced) to copy IDs by right-clicking.

### 4. Deploy slash commands

```bash
npm run deploy
```

### 5. Start the bot

```bash
npm start
```

---

## Usage

### Setting Up the Ticket Panel

Run `/setup` in the channel where customers should open tickets. This posts an embed with an **"Open a Repair Ticket"** button.

### Customer Flow

1. Click **🎫 Open a Repair Ticket**
2. Select device type: **Phone** or **Computer**
3. Select priority: **Low / Medium / High / Urgent**
4. Fill in the repair form (device model + issue description)
5. A private ticket channel is created automatically

### Staff Flow

Each ticket channel contains an embed with action buttons:

| Button | Action |
|---|---|
| 👤 **Assign to Me** | Claim the ticket |
| 🔧 **In Progress** | Mark work as started |
| ⚡ **Priority** | Change the priority level |
| 📅 **Set Due Date** | Set a repair deadline |
| 🔒 **Close Ticket** | Close and lock the ticket |
| 🗑️ **Delete Channel** | Permanently delete after closing |

---

## Slash Commands

| Command | Description | Permission |
|---|---|---|
| `/setup` | Post the ticket panel in this channel | Administrator |
| `/tickets` | View an overview of all tickets | Manage Channels |
| `/close` | Close this ticket | Manage Channels |
| `/assign @user` | Assign a technician to this ticket | Manage Channels |
| `/status <status>` | Update ticket status | Manage Channels |
| `/priority <level>` | Update ticket priority | Manage Channels |
| `/setdue <date>` | Set the due date for this ticket | Manage Channels |

---

## Ticket Data

Tickets are stored in `data/tickets.json`. Each ticket record includes:

```json
{
  "id": "channel_id",
  "ticketNumber": 1,
  "userId": "customer_user_id",
  "username": "customerUsername",
  "deviceType": "Phone",
  "deviceModel": "iPhone 15 Pro",
  "issue": "Cracked screen, touch still works.",
  "priority": "High",
  "status": "In Progress",
  "assignedTo": "technician_user_id",
  "assignedName": "technicianUsername",
  "dueDate": "April 15, 2026",
  "embedMessageId": "embed_message_id",
  "createdAt": "2026-04-10T12:00:00.000Z",
  "updatedAt": "2026-04-10T14:30:00.000Z"
}
```

---

## File Structure

```
Discord Ticket System/
├── data/
│   └── tickets.json          # Ticket storage (auto-created)
├── src/
│   ├── commands/
│   │   ├── assign.js
│   │   ├── close.js
│   │   ├── priority.js
│   │   ├── setdue.js
│   │   ├── setup.js
│   │   ├── status.js
│   │   └── tickets.js
│   ├── events/
│   │   ├── interactionCreate.js  # All bot interactions
│   │   └── ready.js
│   └── utils/
│       ├── embeds.js             # Embed & button builders
│       └── ticketManager.js      # JSON CRUD operations
├── .env                      # Your secrets (never commit this)
├── .env.example
├── .gitignore
├── config.json               # Server configuration
├── deploy-commands.js        # Run once to register slash commands
├── index.js                  # Bot entry point
└── package.json
```
