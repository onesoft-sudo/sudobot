import BaseEvent from '../../utils/structures/BaseEvent';
import { FileOptions, Message } from 'discord.js';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import path from 'path';
import MessageEmbed from '../../client/MessageEmbed';

export default class MessageCreateEvent extends BaseEvent {
    constructor() {
        super('messageCreate');
    }

    async run(client: DiscordClient, message: Message) {
        if (message.author.bot || !message.guild || message.channel.type === 'DM') 
            return;

        await client.setMessage(message);

        await client.spamFilter.start(message);
        await client.messageFilter.start(message);
        
        if (message.content.startsWith(client.config.get('prefix'))) {
            const [cmdName, ...args] = await message.content
                .slice(client.config.get('prefix').length)
                .trim()
                .split(/ +/);
                
            const command = await client.commands.get(cmdName);
            const allowed = await client.auth.verify(message.member!, cmdName);

            if (command && command.supportsLegacy) {
                if (allowed) {
                    await command.run(client, message, {
                        cmdName,
                        args,
                        argv: [cmdName, ...args],
                        normalArgs: args.filter(a => a[0] !== '-'),
                        options: args.filter(a => a[0] === '-'),
                        isInteraction: false
                    } as CommandOptions);    
                }
                else {
                    await message.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription(":x: You don't have permission to run this command.")
                        ]
                    });
                }

                return;
            }
            
            const snippet = await client.snippetManager.get(message.guild!.id, cmdName);

            if (snippet) {
                await message.channel.send({
                    content: snippet.content,
                    files: snippet.files.map(name => {
                        return {
                            name,
                            attachment: path.resolve(__dirname, '../../../storage', name)
                        } as FileOptions
                    }),
                });

                return;
            }
        }

        await client.afkEngine.start(message);
    }
}