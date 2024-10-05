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

import type Application from "@framework/app/Application";
import { env } from "@main/env/env";
import type { ApplicationEmoji, GuildEmoji } from "discord.js";

export function emoji(application: Application, name: string) {
    return findEmoji(application, name) || "";
}

export function findEmoji(
    application: Application,
    name: string
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
): GuildEmoji | ApplicationEmoji | undefined {
    const strategy =
        env.EMOJI_RESOLVE_STRATEGY ??
        application.service("configManager").systemConfig.emoji_resolve_strategy;

    ifGuild: if (strategy !== "application") {
        const homeGuild = application.client.guilds.cache.get(env.HOME_GUILD_ID);

        if (!homeGuild) {
            break ifGuild;
        }

        const emoji = homeGuild.emojis.cache.find(
            emoji => emoji.name === name || emoji.identifier === name
        );

        if (emoji) {
            return emoji;
        }
    }

    if (strategy !== "home_guild") {
        const emoji = application.client.application?.emojis.cache.find(
            emoji => emoji.name === name || emoji.identifier === name
        ) as unknown as ApplicationEmoji;

        if (emoji) {
            return emoji;
        }
    }
}
