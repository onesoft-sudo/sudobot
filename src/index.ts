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
import "module-alias/register";
import "reflect-metadata";

import { spawn } from "child_process";
import { GatewayIntentBits, Options, Partials } from "discord.js";
import "dotenv/config";
import Client from "./core/Client";

global.bootDate = Date.now();

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites
];

const partials = [Partials.Channel];

export const client = new Client({
    intents,
    partials,
    makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        ReactionManager: 0,
        DMMessageManager: 0,
        GuildForumThreadManager: 0,
        GuildScheduledEventManager: 0,
        VoiceStateManager: 0,
        StageInstanceManager: 0,
        GuildTextThreadManager: 0,
        GuildStickerManager: 0,
        AutoModerationRuleManager: 0,
        ApplicationCommandManager: 0,
        ThreadMemberManager: 0,
        ThreadManager: 0,
        ReactionUserManager: 0,
        GuildMemberManager: 25,
        GuildBanManager: 0,
        GuildEmojiManager: 25,
        GuildInviteManager: 5,
        GuildMessageManager: 50,
        BaseGuildEmojiManager: 5
    }),
    sweepers: {
        ...Options.DefaultSweeperSettings,
        messages: {
            interval: 1200, // Every 20 minutes.
            lifetime: 600 // Remove messages older than 10 minutes.
        },
        users: {
            interval: 1200,
            filter: () => user => user.bot && user.id !== user.client.user.id // Remove all bots.
        },
        guildMembers: {
            interval: 1200,
            filter: () => member => member.user.bot && member.id !== member.client.user.id // Remove all bots.
        }
    }
});

function spawnNativeProcess() {
    const path = process.env.EXPERIMENTAL_NATIVE_EXECUTABLE_PATH;

    if (path) {
        const child = spawn(path, {
            stdio: "inherit",
            env: process.env
        });

        process.on("exit", () => void (child.killed ? null : child.kill()));
        process.on("uncaughtException", () => void (child.killed ? null : child.kill()));
        process.on("unhandledRejection", () => void (child.killed ? null : child.kill()));
    }
}

(async () => {
    spawnNativeProcess();

    await client.boot();
    await client.loadEvents();
    await client.loadCommands();

    if (process.env.SERVER_ONLY_MODE) {
        await client.server.boot();
        await client.server.start();
    } else {
        await client.login(process.env.TOKEN);
    }
})();
