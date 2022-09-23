import { CommandInteraction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import CommandOptions from '../../types/CommandOptions';
import { emoji, fetchEmoji } from '../../utils/Emoji';

export default class EmbedBuildCommand extends BaseCommand {
    supportsInteractions: boolean = false;
    supportsLegacy: boolean = false;

    constructor() {
        super('embed__build', 'automation', []);
    }

    async run(client: DiscordClient, message: CommandInteraction | Message, options: InteractionOptions | CommandOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply(`${emoji('error')} No embed schema provided.`);
            return;
        }

        try {
            const embedData = JSON.parse((options.isInteraction ? options.options.getString('json_schema')! : options.args.join(' ')).replace(/^embed\:/, ''));

            if (!embedData) {
                throw new Error('Parse Error');
            }

            try {
                const embed = new MessageEmbed(embedData);

                if (embedData.color) {
                    try {
                        embed.setColor(embedData.color);
                    }
                    catch (e) {
                        console.log(e);
                    }
                }
                
                await message.channel?.send({
                    embeds: [embed]
                });
    
                if (message instanceof CommandInteraction)
                    await message.reply({ content: 'Message sent.', ephemeral: true });
                else 
                    message.react((await fetchEmoji('check'))!).catch(console.error);
            }
            catch (e) {
                console.log(e);
                message.reply({ content: 'Invalid options given.', ephemeral: true });
            }
        }
        catch (e) {
            console.log(e);
            message.reply({ content: 'Invalid embed JSON schema given.', ephemeral: true });
            return;
        }
    }
}