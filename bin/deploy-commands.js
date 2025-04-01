#!/usr/bin/env node

/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2022 OSN Inc.
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

require("module-alias/register");
require("reflect-metadata");

const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { ApplicationCommandType, ContextMenuCommandBuilder, SlashCommandBuilder } = require("discord.js");
const { config } = require("dotenv");
const { existsSync } = require("fs");
const path = require("path");

function makeSlashCommandBuilder(command) {
    const builder = command.slashCommandBuilder ?? new SlashCommandBuilder();

    if (!builder.name) builder.setName(command.name);
    if (!builder.description && command.description) builder.setDescription(command.description);

    return builder.setDMPermission(false);
}

function makeContextMenuCommandBuilder(command) {
    return new ContextMenuCommandBuilder().setName(command.name).setType(command.applicationCommandType).setDMPermission(false);
}

(async () => {
    if (existsSync(path.join(__dirname, ".env")) || existsSync(path.join(__dirname, "../.env"))) {
        config({
            path: existsSync(path.join(__dirname, ".env")) ? undefined : path.join(__dirname, "../.env")
        });
    } else {
        process.env.ENV = "prod";
    }

    const { CLIENT_ID, HOME_GUILD_ID, TOKEN } = process.env;

    const commands = [];

    if (!process.argv.includes("--clear")) {
        const clientPath = path.resolve(existsSync(path.join(__dirname, "../build")) ? "build" : "src", "core/Client.js");

        console.info("Importing client from: ", clientPath);

        const { default: Client } = require(clientPath);

        const client = new Client({
            intents: []
        });

        await client.boot({
            events: false
        });

        for (const [name, command] of client.commands) {
            if (name.includes("__") || client.commands.get(name)?.name !== name) continue;
            if (!command.supportsInteractions) continue;

            commands.push(
                ...(command.otherApplicationCommandBuilders ?? []),
                command.applicationCommandType === ApplicationCommandType.ChatInput
                    ? makeSlashCommandBuilder(command)
                    : makeContextMenuCommandBuilder(command)
            );
        }
    }

    console.table(
        commands.map(c =>
            c instanceof SlashCommandBuilder
                ? {
                      type: "ChatInputCommand",
                      name: c.name,
                      description: c.description
                  }
                : { type: "ContextMenuCommand", name: c.name, description: "None" }
        )
    );

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    rest.put(
        Routes[process.argv.includes("--guild") ? "applicationGuildCommands" : "applicationCommands"](CLIENT_ID, HOME_GUILD_ID),
        {
            body: commands
        }
    )
        .then(() =>
            console.log("Successfully registered application " + (process.argv.includes("--guild") ? "guild " : "") + "commands.")
        )
        .catch(console.error)
        .finally(() => process.exit(0));
})();
