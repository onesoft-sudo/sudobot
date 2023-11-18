/*
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

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    InteractionCollector,
    InteractionReplyOptions,
    InteractionType,
    Message,
    MessageEditOptions,
    MessageReplyOptions
} from "discord.js";
import * as uuid from "uuid";
import Client from "../core/Client";
import { log } from "./logger";
import { getComponentEmojiResolvable } from "./utils";

export default class Pagination<T> {
    protected readonly id: string;
    protected readonly client: Client<true>;
    protected maxPage: number = 0;
    protected currentPage: number = 1;
    protected currentData: T[] = [];

    constructor(protected readonly data: Array<T> | null = [], protected readonly options: PaginationOptions<T>) {
        this.id = uuid.v4();
        this.client = options.client;
    }

    getOffset(page: number = 1) {
        return (page - 1) * this.options.limit;
    }

    async getPaginatedData(page: number = 1) {
        log(page, this.getOffset(page));

        if (this.options.fetchData)
            this.currentData = await this.options.fetchData({
                currentPage: page,
                limit: this.options.limit,
                offset: this.getOffset(page)
            });

        return this.data ? this.data.slice(this.getOffset(page), this.getOffset(page) + this.options.limit) : this.currentData;
    }

    async getEmbed(page: number = 1): Promise<EmbedBuilder> {
        const data = await this.getPaginatedData(page);

        return this.options.embedBuilder({
            data: this.data ? data : this.currentData,
            currentPage: this.currentPage,
            maxPages: Math.max(Math.ceil((this.data?.length ?? this.maxPage) / this.options.limit), 1)
        });
    }

    async getMessageOptions(
        page: number = 1,
        actionRowOptions: { first: boolean; last: boolean; next: boolean; back: boolean } | undefined = undefined,
        optionsToMerge: MessageOptions = {}
    ) {
        const options = { ...this.options.messageOptions, ...optionsToMerge };
        const actionRowOptionsDup = actionRowOptions
            ? { ...actionRowOptions }
            : { first: true, last: true, next: true, back: true };

        if (this.options.maxData && this.maxPage === 0)
            this.maxPage = await this.options.maxData({
                currentPage: page,
                limit: this.options.limit,
                offset: this.getOffset(page)
            });

        log("Max Page", this.maxPage);

        if (actionRowOptionsDup && page <= 1) {
            actionRowOptionsDup.back = false;
            actionRowOptionsDup.first = false;
        }

        if (actionRowOptionsDup && page >= Math.ceil((this.data?.length ?? this.maxPage) / this.options.limit)) {
            actionRowOptionsDup.last = false;
            actionRowOptionsDup.next = false;
        }

        options.embeds ??= [];
        options.embeds.push(await this.getEmbed(page));

        options.components ??= [];
        options.components = [this.getActionRow(actionRowOptionsDup), ...options.components];

        return options;
    }

    getActionRow(
        { first, last, next, back }: { first: boolean; last: boolean; next: boolean; back: boolean } = {
            first: true,
            last: true,
            next: true,
            back: true
        }
    ) {
        if (this.options.actionRowBuilder) {
            return this.options.actionRowBuilder({ first, last, next, back }, this.id);
        }

        const actionRow = new ActionRowBuilder<ButtonBuilder>();

        actionRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`pagination_first_${this.id}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!first)
                .setEmoji(getComponentEmojiResolvable(this.client, "ArrowLeft") ?? "⏮️"),
            new ButtonBuilder()
                .setCustomId(`pagination_back_${this.id}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!back)
                .setEmoji(getComponentEmojiResolvable(this.client, "ChevronLeft") ?? "◀️"),
            new ButtonBuilder()
                .setCustomId(`pagination_next_${this.id}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!next)
                .setEmoji(getComponentEmojiResolvable(this.client, "ChevronRight") ?? "▶️"),
            new ButtonBuilder()
                .setCustomId(`pagination_last_${this.id}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!last)
                .setEmoji(getComponentEmojiResolvable(this.client, "ArrowRight") ?? "⏭️")
        );

        return actionRow;
    }

    async start(message: Message) {
        if (this.data?.length === 0) {
            return;
        }

        const collector = new InteractionCollector(this.client, {
            guild: this.options.guildId,
            channel: this.options.channelId,
            interactionType: InteractionType.MessageComponent,
            componentType: ComponentType.Button,
            message,
            time: this.options.timeout ?? 60_000,
            filter: interaction => {
                if (interaction.inGuild() && (!this.options.userId || interaction.user.id === this.options.userId)) {
                    return true;
                }

                if (interaction.isRepliable()) {
                    interaction.reply({
                        content: "That's not under your control or the button controls are expired",
                        ephemeral: true
                    });
                }

                return false;
            }
        });

        collector.on("collect", async (interaction: ButtonInteraction) => {
            log("Here 2");
            if (!interaction.customId.endsWith(this.id)) {
                return;
            }

            const maxPage = Math.ceil((this.data?.length ?? this.maxPage) / this.options.limit);
            const componentOptions = { first: true, last: true, next: true, back: true };

            if ([`pagination_next_${this.id}`, `pagination_back_${this.id}`].includes(interaction.customId)) {
                log("here");

                if (this.currentPage >= maxPage && interaction.customId === `pagination_next_${this.id}`) {
                    log("here");
                    await interaction.reply({
                        content: maxPage === 1 ? "This is the only page!" : "You've reached the last page!",
                        ephemeral: true
                    });
                    return;
                }

                if (this.currentPage <= 1 && interaction.customId === `pagination_back_${this.id}`) {
                    log("here");
                    await interaction.reply({
                        content: maxPage === 1 ? "This is the only page!" : "You're in the very first page!",
                        ephemeral: true
                    });
                    return;
                }
            }

            if (interaction.customId === `pagination_first_${this.id}`) this.currentPage = 1;
            else if (interaction.customId === `pagination_last_${this.id}`) this.currentPage = maxPage;

            await interaction.update(
                await this.getMessageOptions(
                    interaction.customId === `pagination_first_${this.id}`
                        ? 1
                        : interaction.customId === `pagination_last_${this.id}`
                        ? maxPage
                        : interaction.customId === `pagination_next_${this.id}`
                        ? this.currentPage >= maxPage
                            ? this.currentPage
                            : ++this.currentPage
                        : --this.currentPage,
                    componentOptions,
                    {
                        embeds: [],
                        ...(this.options.messageOptions ?? {})
                    }
                )
            );
        });

        collector.on("end", async () => {
            const [, ...components] = message.components!; // this.getActionRow({ first: false, last: false, next: false, back: false })

            try {
                await message.edit({
                    components: [
                        this.getActionRow({
                            back: false,
                            first: false,
                            last: false,
                            next: false
                        }),
                        ...components
                    ]
                });
            } catch (e) {
                log(e);
            }
        });
    }
}

export interface EmbedBuilderOptions<T> {
    data: Array<T>;
    currentPage: number;
    maxPages: number;
}

export interface FetchDataOption {
    currentPage: number;
    offset: number;
    limit: number;
}

export type MessageOptions = MessageReplyOptions & InteractionReplyOptions & MessageEditOptions;

export interface PaginationOptions<T> {
    client: Client<true>;
    limit: number;
    guildId: string;
    channelId: string;
    userId?: string;
    timeout?: number;
    maxData?: (options: FetchDataOption) => Promise<number>;
    fetchData?: (options: FetchDataOption) => Promise<T[]>;
    messageOptions?: MessageOptions;
    embedBuilder: (options: EmbedBuilderOptions<T>) => EmbedBuilder;
    actionRowBuilder?: (
        options: { first: boolean; last: boolean; next: boolean; back: boolean },
        id: string
    ) => ActionRowBuilder<ButtonBuilder>;
}
