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

export function renderCommandList(): string {
    let str = `Type \`${DiscordClient.client.config.get('prefix')}help <CommandName>\` for more information about a specific command.\n\n`;

    for (const cmd of Help) {
        str += `**${cmd.name}**\n${cmd.shortBrief}\n\n`;
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