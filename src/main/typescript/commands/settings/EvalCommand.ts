/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { Colors } from "@main/constants/Colors";
import PermissionManagerService from "@main/services/PermissionManagerService";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    escapeCodeBlock,
    escapeMarkdown,
    GuildMember,
    InteractionCollector,
    InteractionType
} from "discord.js";
import * as uuid from "uuid";

type EvalCommandArgs = {
    code: string;
};

@ArgumentSchema({
    overloads: [
        {
            definitions: [
                {
                    names: ["code"],
                    types: [RestStringArgument],
                    optional: false,
                    errorMessages: [
                        {
                            [ErrorType.Required]: "You must provide code to evaluate."
                        }
                    ]
                }
            ]
        }
    ]
})
class EvalCommand extends Command {
    public override readonly name = "eval";
    public override readonly description: string = "Evaluates raw JavaScript code.";
    public override readonly defer = true;
    public override readonly usage = ["<...code: RestString>"];
    public override readonly systemAdminOnly = true;
    private _errorOccurred = false;
    private _prettier: unknown;
    private _prettierEstree: unknown;

    @Inject()
    private readonly permissionManagerService!: PermissionManagerService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()

                .addStringOption(option =>
                    option.setName("code").setDescription("The code to evaluate.").setRequired(true)
                )
        ];
    }

    private async getPrettier() {
        if (this._prettier === undefined) {
            try {
                this._prettier = await import("prettier".toString());
                this._prettierEstree = await import("prettier/plugins/estree".toString());
            } catch {
                this._prettier = false;
                this._prettierEstree = undefined;
            }
        }

        if (this._prettier === false) {
            return null;
        }

        return this._prettier as {
            format: (code: string, options: Record<string, unknown>) => Promise<string>;
        };
    }

    private async formatCode(code: string) {
        const prettier = await this.getPrettier();

        if (!prettier) {
            return code;
        }

        return prettier.format(code, {
            parser: "espree",
            plugins: [this._prettierEstree]
        });
    }

    private async sendErrorMessage(
        context: Context,
        code: string,
        errorMessage?: string,
        description?: string
    ) {
        const evalId = uuid.v4();
        const message = await context.reply({
            embeds: [
                {
                    description: `### ${context.emoji("error")} ${errorMessage}\n\nThe system tried to execute the following code:\n\`\`\`js\n${escapeCodeBlock(await this.formatCode(code))}\n\`\`\`\n\n`,
                    color: Colors.Red,
                    footer: {
                        text: "Execution Failed"
                    },
                    timestamp: new Date().toISOString()
                }
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`eval_error_${evalId}`)
                        .setLabel("Error Details")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("📤")
                )
            ]
        });

        const collector = new InteractionCollector(context.guild.client, {
            filter: async interaction => {
                if (interaction.customId !== `eval_error_${evalId}`) {
                    return false;
                }

                if (
                    !(await this.permissionManagerService.isSystemAdmin(
                        interaction.member as GuildMember
                    ))
                ) {
                    interaction
                        .reply({
                            ephemeral: true,
                            content: "You are not allowed to interact with this button."
                        })
                        .catch(this.application.logger.debug);

                    return false;
                }

                return true;
            },
            time: 120_000,
            componentType: ComponentType.Button,
            interactionType: InteractionType.MessageComponent,
            channel: context.channel,
            guild: context.guild,
            message
        });

        collector.on("collect", interaction => {
            interaction
                .reply({
                    embeds: [
                        {
                            description: `### Error Details\n\n${
                                !description || description.trim() === ""
                                    ? "*No output*"
                                    : `\`\`\`${description}\`\`\``
                            }`,
                            color: 0x007bff,
                            footer: {
                                text: "The error details are only visible to you for privacy reasons."
                            }
                        }
                    ],
                    ephemeral: true
                })
                .catch(this.application.logger.debug);
        });

        collector.on("end", () => {
            message
                .edit({
                    embeds: [message.embeds[0]],
                    components: []
                })
                .catch(this.application.logger.debug);
        });
    }

    private createUncaughtErrorHandler(code: string, context: Context) {
        return async (error: Error) => {
            this._errorOccurred = true;

            try {
                return await this.sendErrorMessage(
                    context,
                    code,
                    "An error occurred while evaluating the code",
                    escapeMarkdown(error.stack ?? error.message ?? "[undefined]")
                );
            } catch (args) {
                return this.application.logger.error(args);
            }
        };
    }

    private createUnhandledPromiseRejectionHandler(code: string, context: Context) {
        return async (error: unknown) => {
            this._errorOccurred = true;

            try {
                return await this.sendErrorMessage(
                    context,
                    code,
                    "Caught an unhandled promise rejection while evaluating the code",
                    typeof error === "string" || typeof (error as string)?.toString === "function"
                        ? escapeCodeBlock(
                              (error as string)?.toString
                                  ? (error as string).toString()
                                  : (error as string)
                          )
                        : `${error}`
                );
            } catch (args) {
                return this.application.logger.error(args);
            }
        };
    }

    public override async execute(context: Context, { code }: EvalCommandArgs): Promise<void> {
        this._errorOccurred = false;

        const uncaughtErrorHandler = this.createUncaughtErrorHandler(code, context);
        const rejectionHandler = this.createUnhandledPromiseRejectionHandler(code, context);

        process.on("uncaughtException", uncaughtErrorHandler);
        process.on("unhandledRejection", rejectionHandler);

        try {
            const { application } = this;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { client } = application;

            const result = eval(code);
            const string = `${
                typeof result === "string" || typeof result?.toString === "function"
                    ? escapeCodeBlock(
                          (result as string)?.toString
                              ? (result as string).toString()
                              : (result as string)
                      )
                    : result
            }`;

            if (!this._errorOccurred) {
                const evalId = uuid.v4();
                const message = await context.reply({
                    embeds: [
                        {
                            description: `### ${context.emoji("check")} Execution succeeded\n\nThe following code was executed:\n\`\`\`js\n${escapeCodeBlock(await this.formatCode(code))}\n\`\`\`\n\n`,
                            color: Colors.Green,
                            footer: {
                                text: "Executed"
                            },
                            timestamp: new Date().toISOString()
                        }
                    ],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`eval_output_${evalId}`)
                                .setLabel("Output")
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji("📤")
                        )
                    ]
                });

                const collector = new InteractionCollector(context.guild.client, {
                    filter: async interaction => {
                        if (interaction.customId !== `eval_output_${evalId}`) {
                            return false;
                        }

                        if (
                            !(await this.permissionManagerService.isSystemAdmin(
                                interaction.member as GuildMember
                            ))
                        ) {
                            interaction
                                .reply({
                                    ephemeral: true,
                                    content: "You are not allowed to interact with this button."
                                })
                                .catch(this.application.logger.debug);

                            return false;
                        }

                        return true;
                    },
                    time: 120_000,
                    componentType: ComponentType.Button,
                    interactionType: InteractionType.MessageComponent,
                    channel: context.channel,
                    guild: context.guild,
                    message
                });

                collector.on("collect", interaction => {
                    interaction
                        .reply({
                            embeds: [
                                {
                                    description: `### Output\n\n${
                                        string.trim() === ""
                                            ? "*No output*"
                                            : `\`\`\`${string}\`\`\``
                                    }`,
                                    color: 0x007bff,
                                    footer: {
                                        text: "The output is only visible to you for privacy reasons."
                                    }
                                }
                            ],
                            ephemeral: true
                        })
                        .catch(this.application.logger.debug);
                });

                collector.on("end", () => {
                    message
                        .edit({
                            embeds: [message.embeds[0]],
                            components: []
                        })
                        .catch(this.application.logger.debug);
                });
            }
        } catch (error) {
            if ("stack" in (error as Error) && "message" in (error as Error)) {
                uncaughtErrorHandler(error as Error).catch(this.application.logger.error);
            } else {
                rejectionHandler(error).catch(this.application.logger.error);
            }
        }

        process.off("uncaughtException", uncaughtErrorHandler);
        process.off("unhandledRejection", rejectionHandler);
    }
}

export default EvalCommand;
