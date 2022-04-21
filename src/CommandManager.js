const fs = require("fs");
const path = require("path");
const MessageEmbed = require("./MessageEmbed");
const SnippetManager = require("./SnippetManager");
const { escapeRegex } = require("./util");

class CommandManager {
    constructor(cmdDir) {
        this.msg = null;
        this.commandsDirectory = cmdDir;
        this.commands = [];
        this.commandName = "";
        this.argv = [];
        this.args = [];
        this.loadCommands();
        this.snippetManager = new SnippetManager();
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

    async exec() {
        return await this.commands[this.commandName].handle(this.msg, this);
    }
}

module.exports = CommandManager;