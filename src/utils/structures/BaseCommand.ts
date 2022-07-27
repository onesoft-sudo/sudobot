import { ModalSubmitInteraction } from 'discord-modals';
import { PermissionResolvable, AutocompleteInteraction, CommandInteraction, CommandInteractionOption, ContextMenuInteraction, Interaction, Message, MessageEditOptions, MessageOptions, MessagePayload, WebhookEditMessageOptions } from 'discord.js';
import DiscordClient from '../../client/Client';
import AutoCompleteOptions from '../../types/AutoCompleteOptions';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';

export default abstract class BaseCommand {
    supportsInteractions: boolean = false;
    supportsLegacy: boolean = true;
    supportsContextMenu: boolean = false;
    coolDown?: number;
    ownerOnly: boolean = false;
	permissions: PermissionResolvable[] = [];
	
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

    async autoComplete(client: DiscordClient, interaction: AutocompleteInteraction, options: AutoCompleteOptions): Promise <void> {

    }

    async default(client: DiscordClient, interaction: Interaction): Promise <void> {
        
    }

    async modalSubmit(client: DiscordClient, interaction: ModalSubmitInteraction): Promise <void> {
        
    }

    async deferReply(msg: Message | CommandInteraction | ContextMenuInteraction, options: MessageOptions | string | MessagePayload | WebhookEditMessageOptions, edit: boolean = false): Promise<Message | CommandInteraction> {
        if (msg instanceof Message) {
            return await msg[edit ? 'edit' : 'reply'](options as (MessageOptions & MessageEditOptions));
        }
        
        return (await msg.editReply(options as string | MessagePayload | WebhookEditMessageOptions)) as Message;
    }

    abstract run(client: DiscordClient, message: Message | Interaction, options: CommandOptions | InteractionOptions): Promise<void>;
}
