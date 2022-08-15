import DiscordClient from "../client/Client";
import { Guild } from "discord.js";
import { appendFile } from "fs/promises";
import Service from "../utils/structures/Service";

export enum LogLevel {
    LOG = 'log',
    INFO = 'info',
    WARN = 'warn',
    CRITICAL = 'critical',
    ERROR = 'error'
}

export default class DebugLogger extends Service {
    private joinLeaveLogFile = __dirname + '/../../logs/join-leave.log';
    private appLogFile = __dirname + '/../../logs/app.log';
    
    async logApp(level: LogLevel, message: string) {
        await this.log(this.appLogFile, level, message);
    }

    async logLeaveJoin(level: LogLevel, message: string) {
        await this.log(this.joinLeaveLogFile, level, message);
    }

    async log(stream: string, level: LogLevel, message: string) {
        await appendFile(stream, `[${new Date().toISOString()}] [${level}] ${message}\n`);
    }
}