# Getting Started

Thanks for choosing SudoBot! In this article, you'll learn how to set up a custom instance of SudoBot and configure it to meet your requirements.

> **Note:** If you don't want to set up the bot yourself and prefer a pre-hosted solution for free, you can contact [@rakinar2](https://discord.com/users/774553653394538506) on Discord. Your Discord server should have at least 50 members to be eligible.

## Requirements
Ensure that you meet the following requirements to host SudoBot:

- A Discord API Application token (Obtain a token from [Discord Developer Portal](https://discord.com/developers/applications))
- [Node.js](https://nodejs.org) version 18 or higher
- A PostgreSQL database (For free PostgreSQL hosting, check [Neon](https://neon.tech))

You can also set up additional features with these tokens:
- Cat and dog API Token (for fetching cat and dog images using `cat` and `dog` commands)
- Pixabay API Token to use the `pixabay` command
- Discord Webhook URL for sending error reports

## Cloning the Project and Setting Up
Clone the repository using git or download the [latest release](https://github.com/onesoft-sudo/sudobot/releases/latest) and extract it. If you choose to clone, use the following command:

```bash
git clone https://github.com/onesoft-sudo/sudobot
cd sudobot/
Install dependencies:

```bash

npm install -D
Generate the JSON config schema files:

```bash
npx ts-node scripts/generate-config-schema.ts
Environment Variables
Create a file named .env in the root project directory and add the following variables:
dotenv

# Bot Token
TOKEN=
# Main Server ID
HOME_GUILD_ID=
# Client ID
CLIENT_ID=
# Database URL
DB_URL=

# Additional Environment Variables (if needed)
DEBUG=
SUDO_ENV=
NODE_ENV=
CAT_API_TOKEN=
DOG_API_TOKEN=
Setting Up a Database for the Bot
Set the DB_URL in .env to your PostgreSQL database URL. Then, run:

```bash

npx prisma db push
This command creates the necessary tables in the database.

Configuration
Edit the config/config.json and config/system.json files as needed. Follow the provided JSON schema and autocomplete features in your IDE/editor.

Registering Application Commands
Run the following command to register application slash commands and context menu commands:

```bash

node scripts/deploy-commands.js
Building the Bot
Compile the bot using:

```bash
npm run build
Starting the Bot
Start the bot:

```bash

npm start
If configured correctly, the bot will log in successfully to Discord. Congratulations, your SudoBot instance is ready!

#Emojis
Download custom emojis from [here](https://www.onesoftnet.eu.org/downloads/sudo/emojis/). If not added, the bot may send messages that look odd.