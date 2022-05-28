import { CommandInteraction, CommandInteractionOption, Interaction, Message, MessageEditOptions, MessageOptions, MessagePayload, WebhookEditMessageOptions } from 'discord.js';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';

export default abstract class BaseCommand {
    supportsInteractions: boolean = false;
    supportsLegacy: boolean = true;
    coolDown?: number;

    constructor(private name: string, private category: string, private aliases: Array<string>) {

    }

    getName(): string { 
        return this.name; 
    }

    getCategory(): string { 
        return this.category; 
    }

    getAliases(): Array<string> { 
        return this.aliases; 
    }

    async deferReply(msg: Message | CommandInteraction, options: MessageOptions | string | MessagePayload | WebhookEditMessageOptions, edit: boolean = false): Promise<Message | CommandInteraction> {
        if (msg instanceof Message) {
            return await msg[edit ? 'edit' : 'reply'](options as (MessageOptions & MessageEditOptions));
        }
        
        return (await msg.editReply(options as string | MessagePayload | WebhookEditMessageOptions)) as Message;
    }

    abstract run(client: DiscordClient, message: Message | Interaction, options: CommandOptions | InteractionOptions): Promise<void>;
}