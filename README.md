<p align="center">
<img src="https://res.cloudinary.com/rakinar2/image/upload/v1659628446/SudoBot-new_cvwphw.png" height="200px" width="200px">
</p> 

<h1 align="center">SudoBot</h1>

<p align="center">
<a href="https://github.com/onesoft-sudo/sudobot/actions/workflows/build.yml"><img src="https://github.com/onesoft-sudo/sudobot/actions/workflows/build.yml/badge.svg" alt="Build"></a>
<img src="https://img.shields.io/github/license/onesoft-sudo/sudobot?label=License" alt="GitHub">
<img src="https://img.shields.io/github/package-json/v/onesoft-sudo/sudobot?label=Version" alt="GitHub package.json version">
<img src="https://img.shields.io/github/commit-activity/w/onesoft-sudo/sudobot?label=Commit%20Activity" alt="GitHub commit activity">
<a href="https://discord.gg/892GWhTzgs"><img src="https://img.shields.io/discord/964969362073198652?label=OSN+Support+Chat" alt="Discord"></a>
</p>

<p align="center">
A free and open source Discord bot for moderation purposes. <a href="https://docs.sudobot.onesoftnet.eu.org/features/screenshots/">Click here</a> to see the screenshots.
</p>

### Features

- Strong automoderation system with tools like anti-spam and anti-raid ([Click here](https://docs.sudobot.onesoftnet.eu.org/automoderation/#what-can-the-bot-do) to see the full list)
- Useful moderation tools and utilities 
- Secure
- Fun commands
- Active development & support

### Getting started

You can request an invite for SudoBot [here](https://discord.gg/pazm3tqYh5), it's completely free.
Alternatively, you can create your own Discord API application and then host SudoBot.

### Setup for Custom Hosting

### Note

**It's not recommended to build and use the code from `main` branch, because we're migrating from v4 to v5 with big changes. Some commands/features may not be available or complete. Therefore use a stable release.**

#### Requirements
* NodeJS version 16 or higher
* MongoDB version 5.0 or higher ([Go to MongoDB Atlas for a free MongoDB cluster](https://www.mongodb.com/atlas))
* A Discord API application token with proper setup

#### Optional Services
* Cat and dog API Token (for fetching cat and dog images using `cat` and `dog` commands, the tokens can be obtained at [thecatapi.com](https://thecatapi.com) and [thedogapi.com](https://thedogapi.com))
* Pixabay API Token (can be obtained [here](https://pixabay.com/api/docs/))
* A Discord Webhook URL for sending error reports
* A JWT Secret for the API services (if you don't have an API secret, you can run `openssl rand -base64 10` to generate a random base64 string and use it as secret)

### Setup steps

1. Download the latest release or clone the repo by running:

```
git clone https://github.com/onesoft-sudo/sudobot
```

2. Go inside the project directory, and run the following command:

```
npm install -D
```

3. Open up the `config/config.json` file and change at least the following:

```json
{
    "global": {
        "id": "set your home guild id",
        "owners": ["set owner user ids here"],
        ...
    },
    "guild id here": {
       "prefix": "-",
       "mod_role": "the mod role, users having it will be able to use the bot",
       "gen_role": "general role id, which all users have",
       "mute_role": "the muted role id",
       "admin": "the admin role id. users having it will be immune to sudobot.",
       ...
    }
}
```

**Note**: `...` means other options that exist in the config, you can edit them to customize the settings, but not required.

> Alternatively, you can try the new `setup.js` installer script [BETA] by running `node setup.js`. It will ask you some questions about the configuration.

4. Copy the `.env.example` file to `.env` and open it, edit the information (such as bot token. MongoDB URI, etc) as needed.

5. Build the project:

```
npm run build
```

6. Deploy slash commands globally:

```
node deploy-commands.js
```

7. Start the bot:

```
npm start
```

And if everything was configured correctly, you should not see an error and the bot should say `Logged in as [tag]!`.
Then you can run the following command in Discord to make sure everything is working:

```
-about
```

That should show the bot information.
Congratulations! You've successfully set up your own instance of SudoBot!

### Contributors

Thanks to all the contributors!

* [Ar Rakin](https://github.com/virtual-designer)
* [killerclaws12](https://github.com/killerclaws12)

### Support

- **Email**: rakinar2@onesoftnet.eu.org
- **Discord Servers**: [Silly Cats Server](https://discord.gg/catss), [OneSoftNet Server](https://discord.gg/892GWhTzgs)

### Extra 

- **Download Emojis**: https://www.onesoftnet.eu.org/downloads/sudo/emojis/

Copyright © 2022-2023 OSN and all the contributors of SudoBot.
