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

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Message, Snowflake } from "discord.js";
import Service from "../core/Service";
import { HasEventListeners } from "../types/HasEventListeners";
import { TriggerType } from "../types/TriggerSchema";
import { logError } from "../utils/logger";

export const name = "triggerService";

const handlers = {
    sticky_message: "triggerMessageSticky"
} satisfies Record<TriggerType["type"], Extract<keyof TriggerService, `trigger${string}`>>;

type TriggerHandlerContext<M extends boolean = false> = {
    message: M extends false ? Message | undefined : M extends true ? Message : never;
};

type HandlerMethods = typeof handlers extends Record<TriggerType["type"], infer V> ? V : never;

type HasMessageTriggerHandlers = {
    [F in HandlerMethods]: (trigger: TriggerType, context: TriggerHandlerContext<boolean>) => Promise<any>;
};

export default class TriggerService extends Service implements HasEventListeners, HasMessageTriggerHandlers {
    private readonly lastStickyMessages: Record<`${Snowflake}_${Snowflake}`, Message | undefined> = {};
    private readonly lastStickyMessageQueues: Record<`${Snowflake}_${Snowflake}`, boolean> = {};

    private config(guildId: Snowflake) {
        return this.client.configManager.config[guildId]?.auto_triggers;
    }

    onMessageCreate(message: Message<boolean>) {
        if (message.author.bot) {
            return false;
        }

        const config = this.config(message.guildId!);

        if (!config?.enabled || config?.global_disabled_channels?.includes(message.channelId!)) {
            return false;
        }

        this.processTriggers(message, config.triggers);
        return true;
    }

    processTriggers(message: Message, triggers: TriggerType[]) {
        for (const trigger of triggers) {
            this.processTrigger(trigger, {
                channelId: message.channelId!,
                roles: message.member!.roles.cache.keys(),
                userId: message.author.id,
                context: {
                    message
                }
            }).catch(logError);
        }
    }

    async processTrigger<B extends true | false>(
        trigger: TriggerType,
        {
            channelId,
            roles,
            userId,
            context
        }: {
            channelId?: string;
            userId?: string;
            roles?: IterableIterator<Snowflake> | Snowflake[];
            context: TriggerHandlerContext<B>;
        }
    ) {
        if (channelId && !trigger.enabled_channels.includes(channelId)) {
            return;
        }

        if (userId && trigger.ignore_users.includes(userId)) {
            return;
        }

        if (roles) {
            for (const roleId of roles) {
                if (trigger.ignore_roles.includes(roleId)) {
                    return;
                }
            }
        }

        const callback = this[handlers[trigger.type]].bind(this);

        if (handlers[trigger.type].startsWith("triggerMessage")) {
            if (!context.message) {
                throw new Error(
                    "Attempting to call a message trigger without specifying a message object inside the context. This is an internal error."
                );
            }

            await callback(trigger, context as TriggerHandlerContext<true>);
        }
    }

    async triggerMessageSticky(trigger: TriggerType, { message }: TriggerHandlerContext<true>) {
        if (!this.lastStickyMessageQueues[`${message.guildId!}_${message.channelId!}`]) {
            this.lastStickyMessageQueues[`${message.guildId!}_${message.channelId!}`] = true;

            setTimeout(async () => {
                const lastStickyMessage = this.lastStickyMessages[`${message.guildId!}_${message.channelId!}`];

                if (lastStickyMessage) {
                    try {
                        await lastStickyMessage.delete();
                        this.lastStickyMessages[`${message.guildId!}_${message.channelId!}`] = undefined;
                    } catch (e) {
                        logError(e);
                        return;
                    }
                }

                try {
                    const sentMessage = await message.channel.send({
                        content: trigger.message,
                        components:
                            trigger.buttons.length === 0
                                ? undefined
                                : [
                                      new ActionRowBuilder<ButtonBuilder>().addComponents(
                                          ...trigger.buttons.map(({ label, url }) =>
                                              new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel(label)
                                          )
                                      )
                                  ]
                    });

                    this.lastStickyMessages[`${message.guildId!}_${message.channelId!}`] = sentMessage;
                    this.lastStickyMessageQueues[`${message.guildId!}_${message.channelId!}`] = false;
                } catch (e) {
                    logError(e);
                }
            }, 2000);
        }
    }
}
