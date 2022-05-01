const fs = require("fs");
const path = require("path");
const MessageEmbed = require("./MessageEmbed");
const SnippetManager = require("./SnippetManager");
const Shield = require("./Shield");
const { escapeRegex } = require("./util");

class CommandManager {
    constructor(cmdDir) {
        this.msg = null;
        this.commandsDirectory = cmdDir;
        this.commands = [];
        this.commandName = "";
        this.argv = [];
        this.args = [];
        this.options = [];
        this.normalArgs = [];
        this.loadCommands();
        this.snippetManager = new SnippetManager();
        this.shield = new Shield();
    }

    setMessage(msg) {
        this.msg = msg;
        this.argv = msg.content.split(/ +/g);
        this.args = this.argv;
        this.commandName = this.args.shift().trim().replace(new RegExp(`^${escapeRegex(app.config.get('prefix'))}`), "");
    }

    loadCommands() {
        fs.readdir(this.commandsDirectory, (err, files) => {
            if (err) {
                return console.log('Unable to scan commands directory: ' + err);
            } 

            this.commandNames = files.map(file => file.replace('\.js', ''));
            
            for (let index in files) {
                this.commands[this.commandNames[index]] = require(path.resolve(this.commandsDirectory, files[index]));
            }
        });
    }

    has() {
        return typeof this.commands[this.commandName] !== 'undefined';
    }

    snippet() {
        return this.snippetManager.find(this.commandName);
    }

    hasValid() {
        return this.has() && this.valid();
    }

    valid() {
        return this.msg.content.startsWith(app.config.get('prefix'));
    }

    async notFound() {
        if (app.config.get('debug')) {
            await app.msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`${escapeRegex(this.commandName)}: command not found`)
                ]
            });
        }
    }

    async notAllowed() {
        if (app.config.get('warn_notallowed')) {
            await app.msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`:x: You don't have permission to run this command.`)
                ]
            });
        }
    }

    async exec() {
        let cmd = this.commands[this.commandName];

        if (cmd.needsOptionParse) {
            this.normalArgs = await this.args.filter(arg => arg[0] !== '-');
            this.options = await this.args.filter(arg => arg[0] === '-');
        }

        return await cmd.handle(this.msg, this);
    }

    verify() {
        return this.shield.verify(this.msg, this);
    }
}

module.exports = CommandManager;