/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2023 OSN Developers.
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

import { EmbedBuilder, PermissionResolvable } from "discord.js";
import Client from "../../core/Client";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { CommandGatewayEventListener } from "../../decorators/GatewayEventListener";
import Pagination from "../../utils/Pagination";
import { log } from "../../utils/logger";

export interface CommandInfo {
    name: string,
    aliases: string[],
    group: string,
    description?: string,
    detailedDscription?: string,
    systemAdminOnly: boolean,
    beta: boolean,
    argumentSyntaxes?: string[],
    botRequiredPermissions?: PermissionResolvable[],
    availableOptions?: Record<string, string>,
    since: string,
    supportsInteractions: boolean,
    supportsLegacy: boolean
}

const commandInformation: Array<CommandInfo> = [];

export default class HelpCommand extends Command {
    public readonly name = "help";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            name: "command",
            optional: true,
        }
    ];
    public readonly permissions = [];

    public readonly description = "Shows this help information.";
    public readonly detailedDscription = "Shows documentation about the bot's commands. You can even get information about individual commands by running `help <command>` where `<command>` is the command name.";

    public readonly argumentSyntaxes = ["[command]"];

    @CommandGatewayEventListener("ready")
    async onReady(client: Client) {
        log("Attempting to read and extract meta info from all the loaded commands...");

        for await (const command of client.commands.values()) {
            if (command.name.includes("__"))
                continue;

            commandInformation.push({
                name: command.name,
                aliases: command.aliases,
                group: command.group,
                description: command.description,
                detailedDscription: command.detailedDscription,
                systemAdminOnly: command.systemAdminOnly,
                beta: command.beta,
                argumentSyntaxes: command.argumentSyntaxes,
                botRequiredPermissions: command.botRequiredPermissions,
                availableOptions: command.availableOptions,
                since: command.since,
                supportsInteractions: command.supportsInteractions,
                supportsLegacy: command.supportsLegacy
            });
        }

        commandInformation.sort((a, b) => a.name.localeCompare(b.name, ["en-US"]));
        log("Successfully read metadata of " + commandInformation.length + " commands");
    }

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);
        const subcommand = context.isLegacy ? context.parsedNamedArgs.command : context.options.getString("command");

        if (!subcommand) {
            const pagination = new Pagination(commandInformation, {
                channelId: message.channelId!,
                client: this.client,
                guildId: message.guildId!,
                limit: 20,
                timeout: 200_000,
                userId: message.member!.user.id,
                embedBuilder({ currentPage, maxPages, data }) {
                    let description = `Run \`${this.client.configManager.config[message.guildId!].prefix}help <commandName>\` to get help about a specific command.\n\`<...>\` means required argument, \`[...]\` means optional argument.\n\n`;

                    for (const commandInfo of data) {
                        description += `**${commandInfo.name}**\n`;
                        description += `${commandInfo.description ?? "*No description is available for this command.*"}\n`;

                        if (commandInfo.systemAdminOnly) {
                            description += ":warning: This command can only be used by bot system administrators.\n";
                        }

                        description += "\n";
                    }

                    return new EmbedBuilder({
                        author: {
                            name: "Help",
                            iconURL: this.client.user?.displayAvatarURL() ?? undefined
                        },
                        color: 0x007bff,
                        description,
                        footer: {
                            text: `Page ${currentPage} of ${maxPages}`
                        }
                    })
                        .setTimestamp()
                },
            });

            const reply = await this.deferredReply(message, (await pagination.getMessageOptions(1)));
            await pagination.start(reply);
        }
        else {
            throw new Error("TODO: This part of the command isn't implemented");
        }
    }
}
