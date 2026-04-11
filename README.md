# Discord Repair Ticket Bot

Phone and computer repair ticketing bot for Discord, built with `discord.js` v14.

## Features

- Button-based ticket creation panel
- Guided 4-step intake flow
  - Device type
  - Priority
  - Customer intake (name, phone, email, model, issue)
  - First-look pre-test checklist
- Private ticket channels with per-user/staff permissions
- Channel naming based on customer + device type (for example: `john-smith-phone`)
- Staff ticket controls
  - Assign to me
  - In progress / reopen
  - Change priority
  - Set due date
  - Add tech notes
  - Close with completion checklist
  - Delete ticket channel
- Close workflow checklist before closing
  - Customer notified
  - Work completed
  - Tested/verified
  - Payment received
  - Device returned
  - Optional close notes
- Ticket and archive visibility
  - `/tickets` for active ticket overview
  - Persistent closed ticket archive in `data/closedTickets.json`
  - `/archives` command for in-Discord archive lookup

## Requirements

- Node.js 18+
- Discord application and bot token

## Discord Setup

1. In Discord Developer Portal:
1. Enable `Server Members Intent` under Bot settings.
1. Under OAuth2 URL Generator, include scopes: `bot`, `applications.commands`.

Recommended bot permissions:

- Manage Channels
- View Channels
- Send Messages
- Read Message History
- Embed Links
- Manage Messages
- Manage Roles

## Local Setup

1. Install dependencies:

```bash
npm install
```

1. Create `.env` from `.env.example`:

```env
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
```

1. Configure `config.json` with numeric Discord IDs:

```json
{
  "guildId": "YOUR_SERVER_ID",
  "staffRoleId": "YOUR_STAFF_ROLE_ID",
  "ticketsCategoryId": "OPTIONAL_CATEGORY_OR_CHILD_CHANNEL_ID",
  "logChannelId": "OPTIONAL_LOG_CHANNEL_ID"
}
```

Notes:

- `ticketsCategoryId` can be either:
  - A category ID, or
  - A text channel ID that is inside a category (the bot resolves parent category)

1. Deploy slash commands:

```bash
npm run deploy
```

1. Start the bot:

```bash
npm start
```

## Usage

1. Run `/setup` where customers should open tickets.
1. Customer clicks `Open a Repair Ticket` and completes the 4-step intake.
1. Bot creates private channel and posts ticket embed with staff controls.
1. Staff can add tech notes and work the ticket.
1. Staff closes ticket through the completion checklist modal.
1. Closed ticket remains archived for reference even if channel is deleted.

## Slash Commands

- `/setup` - Post ticket panel (Administrator)
- `/tickets` - Active ticket overview (Manage Channels)
- `/assign technician:<user>` - Assign tech (Manage Channels)
- `/status status:<Open|In Progress|Closed>` - Update status (Manage Channels)
- `/priority level:<Low|Medium|High|Urgent>` - Update priority (Manage Channels)
- `/setdue date:<text>` - Set due date (Manage Channels)
- `/close` - Close ticket (Manage Channels)
- `/archives recent [limit]` - Show recent archived tickets (Manage Channels)
- `/archives ticket number:<n>` - Show one archived ticket in detail (Manage Channels)
- `/archives customer name:<text>` - Search archived tickets by customer name (Manage Channels)

## Data Files

- `data/tickets.json` - Active ticket store
- `data/closedTickets.json` - Archived closed ticket store

Archived entries include the ticket snapshot plus archive metadata such as `archivedAt`, `closedBy`, and `closeSource`.

## Project Structure

```
Discord Ticket System/
├── data/
│   ├── tickets.json
│   └── closedTickets.json
├── src/
│   ├── commands/
│   │   ├── archives.js
│   │   ├── assign.js
│   │   ├── close.js
│   │   ├── priority.js
│   │   ├── setdue.js
│   │   ├── setup.js
│   │   ├── status.js
│   │   └── tickets.js
│   ├── events/
│   │   ├── interactionCreate.js
│   │   └── ready.js
│   └── utils/
│       ├── archiveManager.js
│       ├── embeds.js
│       └── ticketManager.js
├── .env
├── .env.example
├── .gitignore
├── config.json
├── deploy-commands.js
├── index.js
├── package.json
└── package-lock.json
```
