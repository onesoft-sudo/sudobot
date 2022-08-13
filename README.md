<p align="center">
<img src="https://res.cloudinary.com/rakinar2/image/upload/v1659628446/SudoBot-new_cvwphw.png" height="200px" width="200px">
</p>

<h1 align="center">SudoBot</h1>

<p align="center">
<a href="https://github.com/onesoft-sudo/sudobot/actions/workflows/build.yml"><img src="https://github.com/onesoft-sudo/sudobot/actions/workflows/build.yml/badge.svg" alt="Build"></a>
<img src="https://img.shields.io/github/license/onesoft-sudo/sudobot?label=License" alt="GitHub">
<img src="https://img.shields.io/github/package-json/v/onesoft-sudo/sudobot?label=Version" alt="GitHub package.json version">
<img src="https://img.shields.io/github/commit-activity/w/onesoft-sudo/sudobot?label=Commit%20Activity" alt="GitHub commit activity">
<a href="https://discord.gg/892GWhTzgs"><img src="https://img.shields.io/discord/964969362073198652?label=Support+Chat" alt="Discord"></a>
</p>

<p align="center">
A Discord bot for moderation purposes.
</p>

### Features

- Strong automoderation system with tools like anti-spam and anti-raid
- Useful moderation tools 
- Secure
- Fun commands

### Getting started

You can request an invite for SudoBot [here](https://sudobot.everything-server.ml/).
Alternatively, you can create your own Discord API application and then host SudoBot.

### Setup for Custom Hosting

First, download the latest release or clone the repo by running:

```
git clone https://github.com/onesoft-sudo/sudobot
```

Then go inside the project directory, and run the following commands:

```
mkdir config tmp storage logs
touch logs/join-leave.log
echo "{}" > config/snippets.json
cp sample-config.json config/config.json
npm install -D
```

Then open up the `config/config.json` file and change at least the following:

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

Build the project:

```
npm run build
```

Deploy slash commands globally:

```
node deploy-commands.js
```

Start the bot:

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

### Support

- **Email**: rakinar2@onesoftnet.eu.org
- **Discord Server**: [Support Server Invite](https://discord.gg/892GWhTzgs)
