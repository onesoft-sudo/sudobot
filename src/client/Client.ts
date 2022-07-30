import { Client, ClientOptions, Collection, Interaction, Message } from 'discord.js';
import BaseEvent from '../utils/structures/BaseEvent';
import BaseCommand from '../utils/structures/BaseCommand';
import { Config } from './Config';
import Database from './Database';
import path from 'path';
import Logger from '../automod/Logger';
import SnippetManager from '../services/SnippetManager';
import AFKEngine from '../services/AFKEngine';
import Auth from '../services/Auth';
import MessageFilter from '../automod/MessageFilter';
import AntiRaid from '../automod/AntiRaid';
import Starboard from '../services/Starboard';
import Server from '../api/Server';
import Cooldown from '../automod/Cooldown';
import StartupManager from '../services/StartupManager';
import AutoClear from '../automod/AutoClear';
import RandomStatus from '../services/RandomStatus';
import DebugLogger from '../services/DebugLogger';
import BaseCLICommand from '../utils/structures/BaseCLICommand';
import discordModals from 'discord-modals';
import SpamFilter from '../automod/SpamFilter';
import Verification from '../services/Verification';
import Welcomer from '../services/Welcomer';

export default class DiscordClient extends Client {
    private _commands = new Collection<string, BaseCommand>();
    private _cliCommands = new Collection<string, BaseCLICommand>();
    private _events = new Collection<string, BaseEvent>();

    rootdir: string;
    msg: Message | Interaction | null = null;

    config: Config;
    db: Database;
    logger: Logger;
    snippetManager: SnippetManager;
    afkEngine: AFKEngine;
    auth: Auth;
    spamFilter: SpamFilter;
    messageFilter: MessageFilter;
    antiraid: AntiRaid;
    starboard: Starboard;
    server: Server;
    cooldown: Cooldown;
    startupManager: StartupManager;
    autoClear: AutoClear;
    randomStatus: RandomStatus;
    debugLogger: DebugLogger;
    verification: Verification;
    welcomer: Welcomer;

    static client: DiscordClient;

    constructor(options: ClientOptions, rootdir: string = __dirname) {
        super({
            ws: {
                properties: {
                    $browser: "Discord iOS"
                }
            },
            ...options
        });
        
        console.log('init');        

        this.rootdir = rootdir;
        
        DiscordClient.client = this;

        this.config = new Config(this);
        this.db = new Database(path.resolve(rootdir, 'database.db'), this);
        this.logger = new Logger(this);
        this.snippetManager = new SnippetManager(this);
        this.afkEngine = new AFKEngine(this);
        this.auth = new Auth(this);
        this.spamFilter = new SpamFilter(this);
        this.messageFilter = new MessageFilter(this);
        this.antiraid = new AntiRaid(this);
        this.starboard = new Starboard(this);
        this.server = new Server(this);
        this.cooldown = new Cooldown(this);
        this.startupManager = new StartupManager(this);
        this.autoClear = new AutoClear(this);
        this.randomStatus = new RandomStatus(this);
        this.debugLogger = new DebugLogger(this);
        this.verification = new Verification(this);
        this.welcomer = new Welcomer(this);
        
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
}
