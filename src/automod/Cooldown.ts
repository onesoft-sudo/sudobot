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


export default class Cooldown {
    config: CooldownConfig;
    cooldownCommands: Array <string> = [];
    cooldownTimes: Array <Date> = [];

    constructor(protected client: DiscordClient) {
        this.config = {} as CooldownConfig;
    }

    async start(msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions): Promise <boolean> {
        this.config = this.client.config.get('cooldown');

        const { cmdName } = options;
        const command = this.client.commands.get(cmdName)!;

        if (!this.config.enabled && !command.coolDown) {
            return true;
        }

        if (!command.coolDown && (msg.member as GuildMember).roles.cache.has(this.client.config.get('mod_role')))
            return true;

        let time = null;

        if (command.coolDown) {
            time = command.coolDown;
        }
        else if (this.config.cmds[cmdName]) {
            time = this.config.cmds[cmdName];
        }
        else {
            time = this.config.global;
        }

        if (time === null) {
            return true;
        }

        console.log(time);
        const index = this.cooldownCommands.indexOf(`${msg.member!.user.id}/${msg.guild!.id}/${cmdName}`);
        
        if (index !== -1) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(':clock: Please try again in ' + timeProcess(((time - ((new Date()).getTime() - this.cooldownTimes[index].getTime())) + 1) / 1000))
                ]
            });

            return false;
        }

        this.cooldownCommands.push(`${msg.member!.user.id}/${msg.guild!.id}/${cmdName}`);
        this.cooldownTimes.push(new Date());
        
        setTimeout(() => {
            console.log('Clearing...');
            console.log(this.cooldownCommands, this.cooldownTimes);
            
            this.cooldownCommands = this.cooldownCommands.filter((val, index) => {
                if (val === `${msg.member!.user.id}/${msg.guild!.id}/${cmdName}`) {
                    this.cooldownTimes.splice(index, 1);
                    return false;
                }

                return true;
            });

            console.log(this.cooldownCommands, this.cooldownTimes);
            
        }, time);

        return true;
    }
};