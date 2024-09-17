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

import { Inject } from "@framework/container/Inject";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { Collection, Message, Snowflake, TextChannel } from "discord.js";
import { MessageAutoModServiceContract } from "../contracts/MessageAutoModServiceContract";
import type ConfigurationManager from "../services/ConfigurationManager";
import type ModerationActionService from "../services/ModerationActionService";
import type PermissionManagerService from "../services/PermissionManagerService";
import { safeMemberFetch } from "../utils/fetch";

type Cache = {
    timestamps: number[];
    timeout: ReturnType<typeof setTimeout> | null;
};

@Name("spamModerationService")
class SpamModerationService
    extends Service
    implements MessageAutoModServiceContract, HasEventListeners
{
    private readonly cache = new Collection<`${Snowflake}_${Snowflake}`, Cache>();

    @Inject("configManager")
    private readonly configurationManager!: ConfigurationManager;

    @Inject("moderationActionService")
    private readonly moderationActionService!: ModerationActionService;

    @Inject("permissionManager")
    private readonly permissionManagerService!: PermissionManagerService;

    private configFor(guildId: Snowflake) {
        return this.configurationManager.config[guildId!]?.antispam;
    }

    private async shouldModerate(message: Message) {
        if (message.author.bot || !this.configFor(message.guildId!)?.enabled) {
            return false;
        }

        let { member } = message;

        if (!member) {
            member = await safeMemberFetch(message.guild!, message.author.id);
        }

        if (!member) {
            throw new Error("Member not found");
        }

        return this.permissionManagerService.canAutoModerate(member);
    }

    public onMessageCreate(message: Message<boolean>) {
        if (message.author.bot) {
            return;
        }

        const config = this.configFor(message.guildId!);

        if (!config?.enabled) {
            return;
        }

        const includes = config.channels.list.includes(message.channelId);

        if (
            (config.channels.mode === "exclude" && includes) ||
            (config.channels.mode === "include" && !includes)
        ) {
            return;
        }

        return this.moderate(message);
    }

    public async moderate(message: Message): Promise<void> {
        if (!(await this.shouldModerate(message))) {
            this.application.logger.debug(
                "Spam moderation is disabled for this user",
                message.author.id
            );

            return;
        }

        const config = this.configFor(message.guildId!)!;
        const cache = this.cache.get(`${message.guildId!}_${message.author.id}`) ?? ({} as Cache);

        cache.timestamps ??= [];
        cache.timestamps.push(Date.now());

        if (!cache.timeout) {
            cache.timeout = setTimeout(() => {
                const delayedInfo =
                    this.cache.get(`${message.guildId!}_${message.author.id}`) ?? ({} as Cache);
                const timestamps = delayedInfo.timestamps.filter(
                    timestamp => (config?.timeframe ?? 0) + timestamp >= Date.now()
                );

                if (timestamps.length >= (config?.limit ?? 0)) {
                    this.takeAction(message).catch(console.error);
                }

                this.cache.delete(`${message.guildId!}_${message.author.id}`);
            }, config.timeframe);
        }

        this.cache.set(`${message.guildId!}_${message.author.id}`, cache);
    }

    private async takeAction(message: Message) {
        const config = this.configFor(message.guildId!)!;
        const actions = config.actions.map(action => ({
            ...action,
            reason: "reason" in action && action.reason ? "Spam detected" : undefined
        }));

        await this.moderationActionService.takeActions(message.guild!, message.member!, actions, {
            channel: message.channel as TextChannel,
            message
        });
    }
}

export default SpamModerationService;
