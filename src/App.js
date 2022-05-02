const { Client, Intents } = require("discord.js");
const { config } = require("dotenv");
const CommandManager = require("./CommandManager");
const path = require("path");
const fs = require("fs");
const Config = require("./Config");
const Database = require("./Database");
const Logger = require("./Logger");
const SpamFilter = require("./SpamFilter");
const server = require("./server");
const AntiRaid = require("./AntiRaid");

class App {
    constructor(rootdir) {
        global.app = App.app = this;
        this.rootdir = rootdir;
        this.loadConfig();
        this.env = process.env;

        this.client = new Client({
            partials: ["CHANNEL"],
            intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_MESSAGES,
                Intents.FLAGS.DIRECT_MESSAGES, 
                Intents.FLAGS.DIRECT_MESSAGE_TYPING,
                Intents.FLAGS.GUILD_PRESENCES,
                Intents.FLAGS.GUILD_MEMBERS,
            ]
        });

        this.config = new Config();
        this.db = new Database(path.resolve(__dirname, '..', 'database.db'));
        this.commandManager = new CommandManager(path.resolve(__dirname, rootdir, "commands"));
        this.logger = new Logger();
        this.spamFilter = new SpamFilter();
        this.antiRaid = new AntiRaid();
        this.boot();
    }

    boot() {
        this.on('ready', () => {
            console.log("Logged in as " + this.client.user.tag);
            server();
        });

        this.on('messageCreate', async (message) => {
            if (message.author.bot || !message.guild || message.channel.type == 'dm') {
                return;
            }

            await (this.msg = message);
            
            await this.spamFilter.start(message);

            await this.commandManager.setMessage(message);

            const valid = await this.commandManager.valid();
            const has = await this.commandManager.has();
            const snippet = await this.commandManager.snippet();
            const allowed = await this.commandManager.verify();
            
            if (valid && has && allowed) {
                await this.exec();
            }
            else if (valid && snippet !== undefined) {
                await message.channel.send({
                    content: snippet.content
                });
            }
            else if (valid && !has) {
                await this.commandManager.notFound();
            }
            else if (valid && has && !allowed) {
                await this.commandManager.notAllowed();
            }
        });

        this.on("messageUpdate", async (oldMessage, newMessage) => {
            if (oldMessage.author.bot)
                return;

            await this.logger.logEdit(oldMessage, newMessage);
        });

        this.on("messageDelete", async (message) => {
            if (message.author.bot)
                return;

            await this.logger.logDelete(message);
        });

        this.on("guildCreate", guild => {
            console.log("Joined a new guild: " + guild.name);

            this.config.props[guild.id] = {
                prefix: "-",
                debug: false,
            };

            this.config.write();
        })
        
        this.on("guildDelete", guild => {
            console.log("Left a guild: " + guild.name);
            delete this.config.props[guild.id];
            this.config.write();
        })

        this.on('guildMemberAdd', async (member) => {
            console.log('Joined');
            await this.antiRaid.start(member);
        });
    }

    loadConfig() {
        if (fs.existsSync(path.join(__dirname, this.rootdir, '.env'))) {
            console.log("Loading .env file");
            config();
        }
    }

    on(event, handler) {
        this.client.on(event, handler);
    }

    exec() {
        this.commandManager.exec();
    }

    run() {
        this.client.login(process.env.TOKEN);
    }

    tempFileCreate(name) {
        const fullname = path.join(__dirname, '..', 'tmp', name);
        const file = fs.createWriteStream(fullname);

        return {
            name: fullname,
            file
        };
    }
}

module.exports = App;