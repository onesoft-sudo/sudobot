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

import { ModalSubmitInteraction } from 'discord-modals';
import { PermissionResolvable, AutocompleteInteraction, CommandInteraction, ContextMenuInteraction, Interaction, Message, MessageEditOptions, MessageOptions, MessagePayload, WebhookEditMessageOptions, GuildMember } from 'discord.js';
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
    
    protected name: string = "";
    protected category: string = "";
    protected aliases: Array<string> = [];
	
    constructor(name?: string, category?: string, aliases?: Array<string>) {
        if (name)
            this.name = name;

        if (category)
            this.category = category;

        if (aliases)
            this.aliases = aliases;
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
    
    async permissionValidation(client: DiscordClient, member: GuildMember): Promise <boolean> {
        return true;
    }

    async autoComplete(client: DiscordClient, interaction: AutocompleteInteraction, options: AutoCompleteOptions): Promise <void> {

    }

    async default(client: DiscordClient, interaction: Interaction): Promise <void> {
        
    }

    async modalSubmit(client: DiscordClient, interaction: ModalSubmitInteraction): Promise <void> {
        
    }

    async deferReply(msg: Message | CommandInteraction | ContextMenuInteraction, options: MessageOptions | string | MessagePayload | WebhookEditMessageOptions, edit: boolean = false): Promise<Message> {
        if (msg instanceof Message) {
            return await msg[edit ? 'edit' : 'reply'](options as (MessageOptions & MessageEditOptions));
        }
        
        return (await msg.editReply(options as string | MessagePayload | WebhookEditMessageOptions)) as Message;
    }

    async perms(client: DiscordClient, message: Message | Interaction) {
        if (client.config.props.global.owners.includes(message.member!.user.id)) {
            return true;
        }

        let member: GuildMember | null = null;

        if (message.member && !(message.member instanceof GuildMember)) {
            try {
                member = (await message.guild?.members.fetch(message.member!.user.id)) ?? null;
            }
            catch (e) {
                console.log(e);
                return false;
            }
        }
        else {
            member = message.member;
        }

        for await (let permission of this.permissions) {
            if (!member?.permissions.has(permission, true)) {                
                if (message instanceof Interaction && !message.isRepliable())
                    return; 
    
                await message.reply({
                    embeds: [
                        {
                            description: ":x: You don't have enough permissions to run this command.",
                            color: 0xf14a60
                        }
                    ]
                });
    
                return false;
            }
        }

        if (!(await this.permissionValidation(client, member!))) {
            if (message instanceof Interaction && !message.isRepliable())
                return; 
            
            await message.reply({
                embeds: [
                    {
                        description: ":x: You don't have enough permissions to run this command.",
                        color: 0xf14a60
                    }
                ]
            });

            return false;
        }

        return true;
    }

    async execute(client: DiscordClient, message: Message | Interaction, options: CommandOptions | InteractionOptions) {
        if (!(await this.perms(client, message))) {
            return;
        } 

        await this.run(client, message, options);
    }

    abstract run(client: DiscordClient, message: Message | Interaction, options: CommandOptions | InteractionOptions): Promise<void>;
}
