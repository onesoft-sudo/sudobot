# Getting Started

Thanks for choosing SudoBot! In this article you'll learn how to set up a custom instance of SudoBot and configure it so that it does exactly what you want.

{% hint style="info" %}
If you don't want to set the bot up yourself and want a pre-hosted solution for free, you can contact [@rakinar2](https://discord.com/users/774553653394538506) at Discord. Your Discord server should have at least 50 members to be eligible.
{% endhint %}

## Requirements

These are the requirements to host SudoBot:

* A Discord API Application token (Go to [Discord Developer Portal](https://discord.com/developers/applications) to obtain a token)
* [Node.js](https://nodejs.org) version 18 or higher
* A MySQL or PostgreSQL database (If you're looking for a free PostgresSQL hosting service, check out [Supabase](https://supabase.com))

Additionally, you can also set these up if you want to use them:

* Cat and dog API Token (for fetching cat and dog images using `cat` and `dog` commands, the tokens can be obtained at [thecatapi.com](https://thecatapi.com) and [thedogapi.com](https://thedogapi.com))
* Pixabay API Token to use the `pixabay` command (can be obtained [here](https://pixabay.com/api/docs/))
* A Discord Webhook URL for sending error reports

## Cloning the project and setting up

First of all, clone the repository using [git](https://git-scm.com) or download the [latest release](https://github.com/onesoft-sudo/sudobot/releases/latest) and extract it.&#x20;

To clone the repository, run this command:

```
git clone https://github.com/onesoft-sudo/sudobot
```

After this command completes, go inside of the directory. (`sudobot/` if you cloned it using the above command)

Then, install the dependencies using the following command:

```
npm install -D
```

Generate the JSON config schema files using the following command:

```
npx ts-node scripts/generate-config-schema.ts
```

## The environment variables

Create a file named `.env` inside of the root project directory. This file will contain some secret information that the bot needs, to work. (e.g. bot token)

Then you need to add a few variables to `.env` file:

```
# This is your bot's token.
TOKEN=

# This is the home server, where the bot will search for emojis.
HOME_GUILD_ID=

# The client ID of your bot application.
CLIENT_ID=

# Database URL
DB_URL=
```

Here:

* `TOKEN` is your bot token. Make sure to put the correct token here, otherwise the bot won't be able to log in to Discord. The bot token can be obtained from [https://discord.com/developers/applications](https://discord.com/developers/applications).
* `HOME_GUILD_ID` is the main server ID of the bot. The bot expects that it will always stay in that server, and it will search for the emojis there. You can download the emojis and use them freely. To download, go to [the downloads list](https://www.onesoftnet.eu.org/downloads/sudo/emojis/).
* `CLIENT_ID` is the client ID of your bot application. You can obtain the client ID for your bot at [https://discord.com/developers/applications](https://discord.com/developers/applications).
* `DB_URL` is the database URL. We'll be talking about this just in a moment. You can [jump](getting-started.md#setting-up-a-database-for-the-bot) into that section right now if you want.

A few more environment variables can be specified:

* `DEBUG`: Used by the [Prisma](https://prisma.io/) ORM. This enables extra debug logging, aka Verbose Mode.
* `SUDO_ENV` and `NODE_ENV`: If one of these is set to `dev`, then the bot will enter Verbose Mode, and log everything that it does or happens. This is useful if you want to debug the bot or troubleshoot something.

## Setting up a Database for the bot

As we've said [before](getting-started.md#configuration-and-the-environment-variables), `DB_URL` is the environment variable that you need to put in `.env` and the value of this variable should be the database URL. SudoBot at the moment, only supports the following databases:

* PostgreSQL (Recommended)
* MySQL

{% hint style="info" %}
If you want a free PostgreSQL hosting service, check out [Supabase](https://supabase.com/). It's easy to set up, and completely free of cost.
{% endhint %}

Your database URL should look like this if you're using PostgresSQL:

```
postgresql://username:password@hostname:port/dbname
```

* `username` is your database username (usually this is `postgres`)
* `password` is your database password
* `hostname` is your database hostname
* `port` is your database port (usually this is `5432`)
* `dbname` is your database name (usually this is`postgres`)

MySQL database URLs will be almsot similar, except the protocol will be `mysql://` instead of `postgresql://` and the port will be `3306` instead of `5432`.

After you have set the database URL inside `.env`, you can run the following command:

```
npx prisma db push
```

This will create the necessary tables for you inside the database.

## Configuration&#x20;

Now it's time to configure the bot. Now, SudoBot comes with the config files bundled already, but you should edit them.&#x20;

**Step 1.** Open up `config/config.json` and you have two options:

Remove everything inside of the file, and just put an empty object `{}` inside of that file and save it if you don't want to configure anything and just want the default settings. Or,

Manually set the settings inside of the file. If you're following along this documentation and have ran the script `generate-config-schema.ts` (previously specified [here](getting-started.md#cloning-the-project-and-setting-up)), then when you edit the file, you can remove everything inside of the file, and put the following JSON object inside of that file:&#x20;

```
{
    "$schema": "./schema/config.json",
    "guild_id": {
        
    }
}
```

Replace `guild_id` with your main guild ID, where you want to use the bot. If you want to use the bot in multiple servers, specify them here, as the keys of the root object.

If you're using an IDE or editor like [VS Code](https://code.visualstudio.com/) or [WebStorm](https://www.jetbrains.com/webstorm/), you can hit Ctrl + C (or Cmd + C if you're on a Mac) to get auto completion and see available options. The IDE/editor will highlight errors inside of your config file if you have any.

**Step 2.** Open up `config/system.json` file and similarly here you'll get autocompletion. But you don't need to delete everything here, just change the `system_admins` property to your User ID. System Admins are those who have full access to the bot and can control everything. They are able to run commands like `-eval`.

## Building the bot

Now that we have configured the bot and specified every setting, we can go ahead an invoke the TypeScript compiler (`tsc`) to build the bot and generate compiled JavaScript files that the NodeJS interpreter can run. To compile the bot, simply run:

```
npm run build
```

## Starting the bot&#x20;

Now it's time to start the bot. Run the following command to start the bot:

```
npm start
```

And if everything was configured correctly, the bot will log in successfully to Discord.\
Congratulations, you've set up your own instance of SudoBot!

## Help & Support

In case if you're facing issues, feel free to open an issue at [GitHub](https://github.com/onesoft-sudo/sudobot/issues). Or you can contact the Author of the bot in the following ways:

* Email: [rakinar2@onesoftnet.eu.org](mailto:rakinar2@onesoftnet.eu.org)
* Discord: [@rakinar2](https://discord.com/users/774553653394538506)
* Discord Servers: [Silly Cats](https://discord.gg/sillycats), [OSN's server](https://discord.gg/JJDy9SHzGv)

Give the repository a star to show your support! We'll be really thankful if you do.
