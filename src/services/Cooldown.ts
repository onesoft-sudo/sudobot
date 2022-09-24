import { formatDuration, intervalToDuration } from "date-fns";
import { Message } from "discord.js";
import MessageEmbed from "../client/MessageEmbed";
import KeyValuePair from "../types/KeyValuePair";
import BaseCommand from "../utils/structures/BaseCommand";
import Service from "../utils/structures/Service";

export default class Cooldown extends Service {
    cooldowns = new Map<string, (KeyValuePair<NodeJS.Timeout>)>();

    async onMessageCreate(message: Message, command: BaseCommand) {
        if (!command.coolDown) 
            return true;
        
        const commandName = command.getName();

        if (!this.cooldowns.has(message.guild!.id)) {
            this.cooldowns.set(message.guild!.id, {
                [`${commandName}-${message.author.id}-${Date.now()}`]: setTimeout(() => {
                    const cooldowns = this.cooldowns.get(message.guild!.id);

                    if (cooldowns) {
                        for (const cooldown in cooldowns) {
                            if (!cooldowns[cooldown]) {
                                continue;
                            }

                            if (cooldown.startsWith(`${commandName}-${message.author.id}`)) {
                                delete cooldowns[cooldown];
                                console.log('Cooldown expired', `${commandName}-${message.author.tag}`);
                            }
                        }
                    }
                }, command.coolDown)
            });
        }
        else {
            const cooldowns = this.cooldowns.get(message.guild!.id)!;

            console.log("Cooldowns", cooldowns);

            for (const cooldown in cooldowns) {
                if (cooldown.startsWith(`${commandName}-${message.author.id}`) && cooldowns[cooldown]) {
                    console.log('Cooldown triggered', `${commandName}-${message.author.tag}`);
                    const [,, time] = cooldown.split('-');
                    const end = parseInt(time) + command.coolDown;
                    console.log(end);
                    const timetext = formatDuration(intervalToDuration({ start: Date.now(), end: parseInt(time) + command.coolDown }));

                    await message.reply({
                        embeds: [
                            new MessageEmbed({
                                description: `:clock: Please wait, you're doing that too fast!`,
                                footer: { text: 'Cooldown • ' + (timetext.trim() === '' ? '1 second' : timetext) },
                                color: 0xf14a60
                            })
                        ]
                    });

                    return false;
                }
            }

            cooldowns[`${commandName}-${message.author.id}-${Date.now()}`] = setTimeout(() => {
                const cooldowns = this.cooldowns.get(message.guild!.id);

                if (cooldowns) {
                    for (const cooldown in cooldowns) {
                        if (!cooldowns[cooldown]) {
                            continue;
                        }

                        if (cooldown.startsWith(`${commandName}-${message.author.id}`)) {
                            delete cooldowns[cooldown];
                            console.log('Cooldown expired', `${commandName}-${message.author.tag}`);
                        }
                    }
                }
            }, command.coolDown);
        }

        return true;
    }
}