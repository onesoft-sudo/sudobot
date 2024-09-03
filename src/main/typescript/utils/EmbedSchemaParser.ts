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

import Application from "@framework/app/Application";
import type { TextBasedChannel } from "@framework/types/TextBasedChannel";
import type {
    APIEmbed,
    APIMessage,
    Embed,
    GuildMember,
    JSONEncodable,
    Message,
    MessageCreateOptions,
    MessageEditOptions,
    User
} from "discord.js";
import { EmbedBuilder } from "discord.js";
import JSON5 from "json5";
import { z } from "zod";

type EmbedType = Embed | APIEmbed;
type GetMessageOptions = MessageCreateOptions | APIMessage | MessageEditOptions;

export default class EmbedSchemaParser {
    private static readonly embedZodSchema = z.object({
        title: z.string().max(256).optional(),
        description: z.string().max(4096).optional(),
        url: z.string().url().optional(),
        timestamp: z.string().datetime().optional(),
        color: z.number().min(0).max(0xffffff).optional(),
        provider: z
            .union([
                z.object({
                    name: z.string(),
                    url: z.string().url()
                }),
                z.object({
                    name: z.string().optional(),
                    url: z.string().url()
                }),
                z.object({
                    name: z.string(),
                    url: z.string().url().optional()
                })
            ])
            .optional(),
        author: z
            .object({
                name: z.string().max(256),
                icon_url: z.string().url().optional(),
                url: z.string().url().optional(),
                proxy_icon_url: z.string().url().optional()
            })
            .optional(),
        footer: z
            .object({
                text: z.string().max(2048),
                icon_url: z.string().url().optional(),
                proxy_icon_url: z.string().url().optional()
            })
            .optional(),
        image: z
            .object({
                url: z.string().url(),
                proxy_url: z.string().url().optional(),
                height: z.number().int().optional(),
                width: z.number().int().optional()
            })
            .optional(),
        thumbnail: z
            .object({
                url: z.string().url(),
                proxy_url: z.string().url().optional(),
                height: z.number().int().optional(),
                width: z.number().int().optional()
            })
            .optional(),
        video: z
            .object({
                url: z.string().url(),
                proxy_url: z.string().url().optional(),
                height: z.number().int().optional(),
                width: z.number().int().optional()
            })
            .optional(),
        fields: z
            .array(
                z.object({
                    name: z.string().max(256),
                    value: z.string().max(1024),
                    inline: z.boolean().optional()
                })
            )
            .optional()
    });

    private static readonly embedRequiredFieldNames = [
        "title",
        "description",
        "author",
        "footer",
        "image",
        "video",
        "thumbnail",
        "fields"
    ];

    public static parseString(string: string): [EmbedBuilder[], string] {
        const length = string.length;
        const embeds = [];
        let outString = string;

        for (let i = 0; i < length; i++) {
            if (
                i + 8 < length &&
                (i === 0 || [" ", "\n"].includes(string[i - 1])) &&
                string.substring(i, i + 8) === "embed::{"
            ) {
                const pos = i;
                i += 7;

                let jsonStream = "";

                while (string.substring(i, i + 3) !== "}::" && i < length) {
                    if (string[i] === "\n") {
                        i = pos;
                        break;
                    }

                    jsonStream += string[i];
                    i++;
                }

                jsonStream += "}";

                if (i !== pos) {
                    try {
                        const parsedJSON = JSON5.parse(jsonStream);

                        if (typeof parsedJSON.color === "string") {
                            parsedJSON.color = parsedJSON.color.startsWith("#")
                                ? parseInt(parsedJSON.color.substring(1), 16)
                                : parseInt(parsedJSON.color);
                        }

                        if (!this.validate(parsedJSON)) {
                            continue;
                        }

                        embeds.push(new EmbedBuilder(parsedJSON));
                        outString = outString.replace(
                            new RegExp(`(\\s*)embed::(.{${jsonStream.length}})::(\\s*)`, "gm"),
                            ""
                        );
                    } catch (e) {
                        console.error(e);
                        continue;
                    }
                }
            }
        }

        return [embeds, outString];
    }

    private static validate(parsedJSON: object) {
        const logger = Application.current().getLogger();
        logger.debug(parsedJSON);

        const { success } = this.embedZodSchema.safeParse(parsedJSON);

        if (!success) {
            logger.debug("Embed validation failed");
            return false;
        }

        for (const key of this.embedRequiredFieldNames) {
            if (key in parsedJSON) {
                return true;
            }
        }

        logger.debug("Embed required key validation failed");
        return false;
    }

    private static toSchemaStringSingle(embed: EmbedType) {
        return `embed::${JSON.stringify(embed)}::`;
    }

    public static toSchemaString(embed: EmbedType): string;
    public static toSchemaString(embeds: EmbedType[]): string;

    public static toSchemaString(embed: EmbedType | EmbedType[]) {
        if (embed instanceof Array) {
            return embed.map(this.toSchemaStringSingle.bind(this));
        }

        return this.toSchemaStringSingle(embed);
    }

    public static getMessageOptions<T extends GetMessageOptions>(payload: T, withContent = true) {
        const { content, embeds = [], ...options } = payload;

        type GetMessageOptionsResult = (T extends MessageCreateOptions
            ? MessageCreateOptions
            : MessageEditOptions) & {
            embeds: (APIEmbed | JSONEncodable<APIEmbed>)[];
        };

        if (!content) {
            return {
                content,
                embeds,
                ...options
            } as unknown as GetMessageOptionsResult;
        }

        const [parsedEmbeds, strippedContent] = EmbedSchemaParser.parseString(content);

        return {
            ...options,
            embeds: [...embeds, ...parsedEmbeds.slice(0, 10)],
            content: withContent ? strippedContent : undefined
        } as unknown as (T extends MessageCreateOptions
            ? MessageCreateOptions
            : MessageEditOptions) & {
            embeds: (APIEmbed | JSONEncodable<APIEmbed>)[];
        };
    }

    public static sendMessage(
        sendable: TextBasedChannel | User | GuildMember,
        options: MessageCreateOptions
    ) {
        return sendable.send(EmbedSchemaParser.getMessageOptions(options));
    }

    public static editMessage(message: Message, options: MessageEditOptions) {
        return message.edit(EmbedSchemaParser.getMessageOptions(options));
    }
}
