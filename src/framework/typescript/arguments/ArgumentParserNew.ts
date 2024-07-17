/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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
import "reflect-metadata"; // FIXME: Remove this line when the issue is fixed

import Application from "@framework/app/Application";
import type { ArgumentConstructor } from "@framework/arguments/Argument";
import ParserConfigError from "@framework/arguments/ParserConfigError";
import StringArgument from "@framework/arguments/StringArgument";
import { pickCastArray } from "@framework/utils/objects";
import Client from "@main/core/Client";
import type { ChatInputCommandInteraction, Message } from "discord.js";
import type { ParseArgsConfig } from "util";
import { parseArgs } from "util";
import type { ArgumentPayload } from "../commands/Command";
import type InteractionContext from "../commands/InteractionContext";
import LegacyContext from "../commands/LegacyContext";
import { HasClient } from "../types/HasClient";

type ArgumentParseResult =
    | {
          error: null | undefined;
          payload: ArgumentPayload;
          abort: undefined;
      }
    | {
          error: string;
          payload: undefined;
          abort: undefined;
      }
    | {
          error: undefined;
          payload: undefined;
          abort: boolean;
      };

type ArgumentParseOptions<
    C extends LegacyContext | InteractionContext<ChatInputCommandInteraction> =
        | LegacyContext
        | InteractionContext<ChatInputCommandInteraction>
> = {
    context: C;
    options?: CommandArgumentOptions;
    config: ArgumentParserConfig;
};

type ArgumentDefinition<T> = {
    optional?: boolean;
    useCanonicalName?: boolean;
} & (
    | {
          type: ArgumentConstructor<T>;
      }
    | {
          types: ArgumentConstructor<T>[];
      }
) &
    (
        | {
              name: string;
          }
        | {
              names: string[];
          }
    );

type ArgumentDefinitionOverload = {
    name?: string;
} & (
    | {
          definition: ArgumentDefinition<unknown>;
      }
    | {
          definitions: ArgumentDefinition<unknown>[];
      }
);

type ArgumentParserConfig =
    | {
          overloads: ArgumentDefinitionOverload[];
      }
    | ArgumentDefinition<unknown>[];

type CommandArgumentOptions = NonNullable<ParseArgsConfig["options"]>;

class ArgumentParser extends HasClient {
    public async parse({ context, options, ...args }: ArgumentParseOptions) {
        if (context.isLegacy()) {
            return this.parseLegacy({ context, options, ...args });
        } else {
            return this.parseInteraction({ context, options, ...args });
        }
    }

    public async parseLegacy({ context, config }: ArgumentParseOptions<LegacyContext>) {
        const { commandContent } = context;

        if (!commandContent) {
            return {
                error: "No command content provided.",
                payload: undefined,
                abort: false
            };
        }

        const overloads: ArgumentDefinitionOverload[] =
            "overloads" in config ? config.overloads : [{ definitions: config }];

        for (const overload of overloads) {
            const result = await this.parseOverload(context, overload);
            console.log("Overload", result);
        }
    }

    private async parseOverload(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>,
        overload: ArgumentDefinitionOverload
    ) {
        const definitions = pickCastArray<ArgumentDefinition<unknown>>(overload, "definition");
        let definitionIndex = 0;
        const parsedArgs: unknown[] = [];

        for (const definition of definitions) {
            const types = pickCastArray<ArgumentConstructor<unknown>>(definition, "type");
            const names = pickCastArray<string>(definition, "name");
            const useCanonicalName = !definition.useCanonicalName && names.length === 1;
            const interactionName = names[0];

            if (types.length === 0 || names.length === 0) {
                throw new ParserConfigError(
                    `Invalid definition at index ${definitionIndex}: No types or names were provided.`
                );
            }

            if (!definition.optional) {
                if (context.isLegacy() && !context.args[definitionIndex]) {
                    return {
                        error: `Missing required argument at index ${definitionIndex}: ${names[0]}`,
                        payload: undefined,
                        abort: false
                    };
                }

                if (!context.isLegacy() && !context.commandMessage.options.get(interactionName)) {
                    return {
                        error: `Missing required argument at index ${definitionIndex} (via interaction): ${interactionName}`,
                        payload: undefined,
                        abort: false
                    };
                }
            }

            let typeIndex = 0;

            for (const type of types) {
                const name = useCanonicalName ? names[0] : names[typeIndex];

                if (!name) {
                    throw new ParserConfigError(
                        `Invalid definition at index ${definitionIndex}: No name was provided for type ${typeIndex}.`
                    );
                }

                try {
                    const { value, error } = context.isLegacy()
                        ? await type.performCast(
                              context,
                              context.commandContent,
                              context.argv,
                              context.args[definitionIndex],
                              definitionIndex,
                              name
                          )
                        : await type.performCastFromInteraction(
                              context,
                              context.commandMessage,
                              name
                          );

                    if (error) {
                        return {
                            error: error.message,
                            payload: undefined,
                            abort: false
                        };
                    }

                    parsedArgs.push(value?.getValue());
                } catch (error) {
                    return {
                        error: error instanceof Error ? error.message : `${error}`,
                        payload: undefined,
                        abort: false
                    };
                }

                typeIndex++;
            }

            definitionIndex++;
        }

        return {
            error: undefined,
            payload: {
                args: parsedArgs
            },
            abort: false
        };
    }

    public async parseInteraction({
        context
    }: ArgumentParseOptions<InteractionContext<ChatInputCommandInteraction>>) {}

    private parseArgumentVector({
        context,
        options = {}
    }: Pick<ArgumentParseOptions<LegacyContext>, "context" | "options">):
        | {
              positionals: string[];
              values: {
                  [key: string]: unknown;
              };
              error?: undefined;
          }
        | {
              error: TypeError;
              positionals: undefined;
              values: undefined;
          } {
        const { args } = context;

        try {
            return parseArgs({
                args,
                allowPositionals: true,
                strict: true,
                options
            });
        } catch (error) {
            return { error: error as TypeError, positionals: undefined, values: undefined };
        }
    }
}

const application = new Application("", "", "");
const client = new Client({ intents: [] });
application.setClient(client);
const parser = new ArgumentParser(client);

const argv = process.argv.slice(2);
const args = argv.slice(1);

parser
    .parse({
        context: new LegacyContext(
            argv[0],
            argv.join(" "),
            {} as unknown as Message<true>,
            args,
            argv
        ),
        options: {
            clean: {
                type: "boolean",
                short: "c"
            }
        },
        config: {
            overloads: [
                {
                    definitions: [
                        {
                            type: StringArgument,
                            name: "name"
                        },
                        {
                            type: StringArgument,
                            name: "value"
                        }
                    ]
                }
            ]
        }
    })
    .then(console.log);

export default ArgumentParser;
