<p align="center">
<img src="https://res.cloudinary.com/rakinar2/image/upload/v1651761676/sudobot4_r257uw.png" height="200px" width="200px">
</p>

<h1 align="center">SudoBot</h1>

<p align="center">
<a href="https://github.com/onesoft-sudo/sudobot/actions/workflows/build.yml"><img src="https://github.com/onesoft-sudo/sudobot/actions/workflows/build.yml/badge.svg" alt="Build"></a>
<img src="https://img.shields.io/github/license/onesoft-sudo/sudobot?label=License" alt="GitHub">
<img src="https://img.shields.io/github/package-json/v/onesoft-sudo/sudobot?label=Version" alt="GitHub package.json version">
<img src="https://img.shields.io/github/commit-activity/w/onesoft-sudo/sudobot?label=Commit%20Activity" alt="GitHub commit activity">
</p>

<p align="center">
A Discord bot for moderation purposes.
</p>

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
sh init.sh
touch config/config.json .env
echo "{}" > config/snippets.json
npm install
npm install -D
```

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
