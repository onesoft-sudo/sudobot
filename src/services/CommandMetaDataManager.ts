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

import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";
import { CommandHelpData } from "../types/CommandHelpData";
import Help from "../utils/Help";
import BaseCommand from "../utils/structures/BaseCommand";

export function getAllCommandData() {
    return Help;
}

export function findCommandData(callback: (data: CommandHelpData) => boolean) {
    return Help.find(callback);
}

export function renderCommandList(limit = 60): string {
    let str = `Type \`${DiscordClient.client.config.get('prefix')}help <CommandName>\` for more information about a specific command.\n\n`;
    let index = 0;

    for (const cmd of Help) {
        if (limit <= index)
            break;

        str += `**${cmd.name}**\n${cmd.shortBrief}\n\n`;
        index++;
    }

    return str;
}

export function renderCommandMeta(cmd: CommandHelpData | string, commandObj?: BaseCommand): MessageEmbed {
    let str = '';
    const command = typeof cmd === 'string' ? findCommandData(c => c.name === cmd) : cmd;

    if (!command)
        throw new Error('Command not found: ' + cmd);
        
    const cmdObj = commandObj ?? DiscordClient.client.commands.get(command.name)!; 

    str += `${command.description ?? command.shortBrief}\n\n`;
    str += `**Usage**\n\`${DiscordClient.client.config.get('prefix')}${command.name} ${command.structure}\`\n\n`;

    if (command.subcommands) {
        str += `**Subcommands**\n`;

        for (let key in command.subcommands)
            str += `\`${key}\` - ${command.subcommands[key]}\n`

        str += '\n\n';
    }
    
    str += `**Examples**\n${command.example.replace(/\%\%/g, DiscordClient.client.config.get('prefix'))}\n\n`;
    str += `**Legacy Commands Support**\n${command.legacyCommand ? 'Available' : 'Not supported'}\n\n`;
    str += `**Slash Commands Support**\n${command.slashCommand ? 'Available' : 'Not supported'}\n\n`;
    str += `**Category**\n\`${cmdObj.getCategory()}\`\n\n`;
    str += `**Notes**\n${command.notes ?? '*No notes available*'}`;

    return new MessageEmbed({
        author: {
            name: `${DiscordClient.client.config.get('prefix')}${command.name}`
        },
        description: str
    });
}