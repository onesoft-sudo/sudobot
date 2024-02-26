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

import { SlashCommandBuilder, escapeCodeBlock, escapeMarkdown } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/Logger";

export default class EvalCommand extends Command {
    public readonly name = "eval";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.StringRest],
            optional: false,
            name: "code",
            errors: {
                required: "You must provide expression(s) to evaluate!"
            }
        }
    ];
    public readonly systemAdminOnly = true;
    public errorOccurred: boolean = false;

    public readonly description = "Execute JavaScript code.";
    public readonly detailedDescription = "This command executes arbitrary JavaScript code. Must be used with caution.";
    public readonly argumentSyntaxes = ["<...Code>"];

    public readonly botRequiredPermissions = [];

    public readonly slashCommandBuilder = new SlashCommandBuilder().addStringOption(option =>
        option.setName("code").setDescription("The code to execute").setRequired(true)
    );

    createUncaughtExecptionHandler(message: CommandMessage) {
        return (e: Error) => {
            this.errorOccurred = true;
            logError(e);

            this.deferredReply(message, {
                embeds: [
                    {
                        description: `${this.emoji("error")} **Exception occurred**\n\n\`\`\`\n${escapeMarkdown(
                            e.message + "\n" + e.stack
                        )}\n\`\`\``,
                        color: 0xf14a60
                    }
                ]
            }).catch(logError);
        };
    }

    createUnhandledRejection(message: CommandMessage) {
        return (e: unknown) => {
            this.errorOccurred = true;
            logError(e);

            this.deferredReply(message, {
                embeds: [
                    {
                        description: `${this.emoji("error")} **Unhandled promise rejection**\n\n\`\`\`\n${
                            typeof e === "string" || typeof (e as any)?.toString === "function"
                                ? escapeCodeBlock((e as any)?.toString ? (e as any).toString() : (e as any))
                                : e
                        }\n\`\`\``,
                        color: 0xf14a60
                    }
                ]
            }).catch(logError);
        };
    }

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        this.errorOccurred = false;

        const code = context.isLegacy ? context.parsedNamedArgs.code : context.options.getString("code", true);
        await this.deferIfInteraction(message);

        const exceptionHandler = this.createUncaughtExecptionHandler(message);
        const rejectionHandler = this.createUnhandledRejection(message);

        process.on("uncaughtExceptionMonitor", exceptionHandler);
        process.on("unhandledRejection", rejectionHandler);

        try {
            const result = eval(code);
            const string = `${
                typeof result === "string" || typeof result?.toString === "function"
                    ? escapeCodeBlock((result as any)?.toString ? (result as any).toString() : (result as any))
                    : result
            }`;

            if (!this.errorOccurred) {
                await this.deferredReply(message, {
                    embeds: [
                        {
                            description: `${this.emoji("check")} **Execution succeeded**\n\n${
                                string.trim() === "" ? "*No output*" : `\`\`\`${string}\`\`\``
                            }`,
                            color: 0x007bff
                        }
                    ]
                });
            }
        } catch (e) {
            logError("Evaluation failed");
            if ("stack" in (e as any) && "message" in (e as any)) exceptionHandler(e as any);
            else rejectionHandler(e);
        }

        process.off("uncaughtExceptionMonitor", exceptionHandler);
        process.off("unhandledRejection", rejectionHandler);
    }
}
