/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License 
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

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
import StartupManager from '../services/StartupManager';
import AutoClear from '../automod/AutoClear';
import RandomStatus from '../services/RandomStatus';
import DebugLogger, { LogLevel } from '../services/DebugLogger';
import BaseCLICommand from '../utils/structures/BaseCLICommand';
import discordModals from 'discord-modals';
import SpamFilter from '../automod/SpamFilter';
import Verification from '../services/Verification';
import Welcomer from '../services/Welcomer';
import Antijoin from '../automod/Antijoin';
import Automute from '../automod/Automute';
import ServiceManager from './ServiceManager';
import ChannelLockManager from '../services/ChannelLockManager';
import Cooldown from '../services/Cooldown';
import ProfileFilter from '../automod/ProfileFilter';
import QueueManager from '../services/QueueManager';
import Common from '../automod/Common';
import AutoResponder from '../automod/AutoResponder';
import InteractionRoleManager from '../services/InteractionRoleManager';
import MessageRules from '../automod/MessageRules';
import InviteTracker from '../services/InviteTracker';
import Autobackup from '../services/Autobackup';
import AIMessageFilter from '../automod/AIMessageFilter';

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
    cooldown: Cooldown = {} as Cooldown;
    profileFilter: ProfileFilter = {} as ProfileFilter;
    queueManager: QueueManager = {} as QueueManager;
    commonService: Common = {} as Common;
    autoResponder: AutoResponder = {} as AutoResponder;
    interactionRoleManager: InteractionRoleManager = {} as InteractionRoleManager;
    messageRules: MessageRules = {} as MessageRules;
    inviteTracker: InviteTracker = {} as InviteTracker;
    autobackup: Autobackup = {} as Autobackup;
    aiMessageFilter: AIMessageFilter = {} as AIMessageFilter;

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
        "@services/Cooldown": "cooldown",
        "@automod/ProfileFilter": "profileFilter",
        "@services/QueueManager": "queueManager",
        "@services/InteractionRoleManager": "interactionRoleManager",
        "@automod/Common": "commonService",
        "@automod/AutoResponder": "autoResponder",
        "@automod/MessageRules": "messageRules",
        "@services/InviteTracker": "inviteTracker",
        "@services/Autobackup": "autobackup",
        "@automod/AIMessageFilter": "aiMessageFilter",
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

        this.rootdir = rootdir;
        
        DiscordClient.client = this;

        this.config = new Config(this);
        this.db = new Database(this);
        this.serviceManager = new ServiceManager(this, this.aliases);
        this.serviceManager.load(this.services);
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
        // await appendFile(path.join(process.env.SUDO_PREFIX ?? (__dirname + "/../../"), "logs", "error.log"), `Uncaught ${error.name}: ${error.message}\n+ ${error.stack}`);
        await this.debugLogger.logApp(LogLevel.CRITICAL, "An internal error was occurred");
        await this.debugLogger.logApp(LogLevel.ERROR, `Uncaught ${error.name}: ${error.message}\n+ ${error.stack}`);
        await this.debugLogger.logToHomeServer(`Uncaught ${error.name}: ${error.message}\n${error.stack}`);
    }
}
