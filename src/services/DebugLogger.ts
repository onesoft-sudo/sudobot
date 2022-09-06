import { MessageEmbed, WebhookClient } from "discord.js";
import { appendFile } from "fs/promises";
import Service from "../utils/structures/Service";
import { splitMessage } from "../utils/util";

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

    async logToHomeServer(message: string, logLevel: LogLevel = LogLevel.ERROR) {
        if (!process.env.DEBUG_WEKHOOK_URL)
            return;
        
        const webhookClient = new WebhookClient({ url: process.env.DEBUG_WEKHOOK_URL! });
        const splitted = splitMessage(message);
        const embed = new MessageEmbed({
            color: logLevel === LogLevel.WARN ? 'GOLD' : 0xf14a60, 
            title: logLevel === LogLevel.WARN ? 'Core Warning' : 'Fatal Error',
            description: splitted.shift(),
        });

        if (splitted.length === 0) {
            embed.setTimestamp();
        }

        try {
            await webhookClient.send({
                embeds: [
                    embed
                ]
            });

            for (const index in splitted) {
                const embed = new MessageEmbed({
                    color: logLevel === LogLevel.WARN ? 'GOLD' : 0xf14a60, 
                    description: splitted[index],
                });

                if (parseInt(index) === (splitted.length - 1)) {
                    embed.setTimestamp();
                }

                await webhookClient.send({
                    embeds: [
                        embed
                    ]
                });
            }
        }
        catch (e) {
            console.log(e);
        }
    }
}