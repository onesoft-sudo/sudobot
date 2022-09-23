import { Client, ClientOptions, Collection, Interaction, Message } from 'discord.js';
import BaseEvent from '../utils/structures/BaseEvent';
import BaseCommand from '../utils/structures/BaseCommand';
import { Config } from './Config';
import Database from './Database';
import path from 'path';
import { appendFile } from "fs/promises";
import Logger from '../automod/Logger';
import SnippetManager from '../services/SnippetManager';
import AFKEngine from '../services/AFKEngine';
import Auth from '../services/Auth';
import MessageFilter from '../automod/MessageFilter';
import AntiRaid from '../automod/AntiRaid';
import Starboard from '../services/Starboard';
import Server from '../api/Server';
import StartupManager from '../services/StartupManager';
import AutoClear from '../automod/AutoClear';
import RandomStatus from '../services/RandomStatus';
import DebugLogger from '../services/DebugLogger';
import BaseCLICommand from '../utils/structures/BaseCLICommand';
import discordModals from 'discord-modals';
import SpamFilter from '../automod/SpamFilter';
import Verification from '../services/Verification';
import Welcomer from '../services/Welcomer';
import Antijoin from '../automod/Antijoin';
import Automute from '../automod/Automute';
import ServiceManager from './ServiceManager';
import ChannelLockManager from '../services/ChannelLockManager';

export default class DiscordClient extends Client {
    private _commands = new Collection<string, BaseCommand>();
    private _cliCommands = new Collection<string, BaseCLICommand>();
    private _events = new Collection<string, BaseEvent>();

    rootdir: string;
    msg: Message | Interaction | null = null;

    config: Config;
    db: Database;
    server: Server;
    serviceManager: ServiceManager;

    logger: Logger = {} as Logger;
    snippetManager: SnippetManager = {} as SnippetManager;
    afkEngine: AFKEngine = {} as AFKEngine;
    auth: Auth = {} as Auth;
    spamFilter: SpamFilter = {} as SpamFilter;
    messageFilter: MessageFilter = {} as MessageFilter;
    antiraid: AntiRaid = {} as AntiRaid;
    starboard: Starboard = {} as Starboard;
    startupManager: StartupManager = {} as StartupManager;
    autoClear: AutoClear = {} as AutoClear;
    randomStatus: RandomStatus = {} as RandomStatus;
    debugLogger: DebugLogger = {} as DebugLogger;
    verification: Verification = {} as Verification;
    welcomer: Welcomer = {} as Welcomer;
    antijoin: Antijoin = {} as Antijoin;
    automute: Automute = {} as Automute;
    channelLock: ChannelLockManager = {} as ChannelLockManager;

    aliases = {
        automod: path.resolve(__dirname, '..', 'automod'),
        services: path.resolve(__dirname, '..', 'services'),
    };

    services = {
        "@services/DebugLogger": "debugLogger",
        "@automod/Logger": "logger",
        "@services/SnippetManager": "snippetManager",
        "@services/AFKEngine": "afkEngine",
        "@services/Auth": "auth",
        "@automod/SpamFilter": "spamFilter",
        "@automod/MessageFilter": "messageFilter",
        "@automod/AntiRaid": "antiraid",
        "@services/Starboard": "starboard",
        "@services/StartupManager": "startupManager",
        "@automod/AutoClear": "autoClear",
        "@services/RandomStatus": "randomStatus",
        "@services/Verification": "verification",
        "@services/Welcomer": "welcomer",
        "@services/ChannelLockManager": "channelLock",
        "@automod/Antijoin": "antijoin",
        "@automod/Automute": "automute",
    };

    static client: DiscordClient;

    constructor(options: ClientOptions, rootdir: string = __dirname) {
        super({
            ws: {
                properties: {
                    browser: "Discord iOS"
                }
            },
            ...options
        });

        process.on('uncaughtException', (error, origin) => {
            console.log('Uncaught', error);
            this.handleCrash(error, origin).then(() => process.exit(-1)).catch(err => {
                console.log(err);
                process.exit(-1);
            });
        });
        
        console.log('init');        

        this.rootdir = rootdir;
        
        DiscordClient.client = this;

        this.config = new Config(this);
        this.db = new Database(this);
        this.serviceManager = new ServiceManager(this, this.aliases);
        this.serviceManager.load(this.services);

        // this.logger = new Logger(this);
        // this.snippetManager = new SnippetManager(this);
        // this.afkEngine = new AFKEngine(this);
        // this.auth = new Auth(this);
        // this.spamFilter = new SpamFilter(this);
        // this.messageFilter = new MessageFilter(this);
        // this.antiraid = new AntiRaid(this);
        // this.starboard = new Starboard(this);
        // this.cooldown = new Cooldown(this);
        // this.startupManager = new StartupManager(this);
        // this.autoClear = new AutoClear(this);
        // this.randomStatus = new RandomStatus(this);
        // this.debugLogger = new DebugLogger(this);
        // this.verification = new Verification(this);
        // this.welcomer = new Welcomer(this);
        // this.antijoin = new Antijoin(this);
        // this.automute = new Automute(this);

        this.server = new Server(this);
        
        discordModals(this);        
    }

    get commands(): Collection<string, BaseCommand> {
        return this._commands; 
    }

    get cliCommands(): Collection<string, BaseCLICommand> {
        return this._cliCommands; 
    }

    get events(): Collection<string, BaseEvent> {
        return this._events; 
    }

    setMessage(msg: Message | Interaction) {
        this.msg = msg;
    }

    async handleCrash(error: Error, origin: NodeJS.UncaughtExceptionOrigin) {
        console.log('here');
        await appendFile(path.join(process.env.SUDO_PREFIX ?? (__dirname + "/../../"), "logs", "error.log"), `Uncaught ${error.name}: ${error.message}\n+ ${error.stack}`);
        await this.debugLogger.logToHomeServer(`Uncaught ${error.name}: ${error.message}\n${error.stack}`);
    }
}
