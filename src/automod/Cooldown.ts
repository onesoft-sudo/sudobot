import { CommandInteraction, GuildMember, Message, User } from "discord.js";
import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";
import CommandOptions from "../types/CommandOptions";
import InteractionOptions from "../types/InteractionOptions";
import { timeProcess, timeSince } from "../utils/util";

export type CooldownConfig = {
    enabled: boolean;
    global: number;
    cmds: {
        [cmd: string]: number;
    }
};

export type RegistryData = {
    user: User;
    guilds: {
        [id: string]: {
            date: Date;
            timeout: NodeJS.Timeout;
        }
    }
};

export default class Cooldown {
    config: CooldownConfig;
    cmdRegistry: Map <string, RegistryData>;

    constructor(protected client: DiscordClient) {
        this.config = {} as CooldownConfig;
        this.cmdRegistry = new Map();
    }

    async start(msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions): Promise <boolean> {
        this.config = this.client.config.get('cooldown');

        if (!this.config.enabled) {
            return true;
        }

        if ((msg.member as GuildMember).roles.cache.has(this.client.config.get('mod_role')))
            return true;

        const { cmdName } = options;
        let time = null;

        if (this.config.cmds[cmdName]) {
            time = this.config.cmds[cmdName];
        }
        else {
            time = this.config.global;
        }

        if (time === null) {
            return true;
        }

        console.log(time);
        

        if (!this.cmdRegistry.has(msg.member!.user.id) || this.cmdRegistry.get(msg.member!.user.id)?.guilds[msg.guild!.id] === undefined) {
            let prevData: any = {};

            if (this.cmdRegistry.has(msg.member!.user.id)) {
                prevData = this.cmdRegistry.get(msg.member!.user.id)?.guilds;
            }
            
            this.cmdRegistry.set(msg.member!.user.id, {
                user: msg.member!.user as User,
                guilds: {
                    ...prevData,
                    [msg.guild!.id]: {
                        date: new Date(),
                        timeout: setTimeout(() => {
                            console.log('Cleared');
                            this.cmdRegistry.delete(msg.member!.user.id);
                        }, time)
                    }
                }
            });
        }
        else {
            const registry = this.cmdRegistry.get(msg.member!.user.id);

            console.log(new Date(registry?.guilds[msg.guild!.id].date.getTime()! + time), new Date);
            

            if ((registry?.guilds[msg.guild!.id].date.getTime()! + time)! > Date.now()) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(":clock: Please try again in " + timeSince(registry?.guilds[msg.guild!.id].date.getTime()!).replace(/ ago$/g, ''))
                    ]
                });

                return false;
            }
        }

        return true;
    }
};