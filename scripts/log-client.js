#!/usr/bin/env node

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

/*
 * Required packages: socket.io-client
 */

const io = require("socket.io-client");
const { createInterface } = require("readline/promises");

function error(message) {
    console.error("Error:", message);
    process.exit(1);
}

async function main() {
    const colors = process.argv.includes("--color");
    const url = process.argv[2];

    if (!url) {
        error("Please specify the Log Server hostname to connect!");
    }

    const readline = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const password = await readline.question("Password: ");
    readline.close();

    const client = io(url.startsWith("http://") ? url : `http://${url}`, {
        extraHeaders: {
            Authorization: `Bearer ${password}`,
            "X-Colorize": colors ? "Yes" : "No"
        }
    });

    console.log("Connecting to:", url);

    client.on("open", () => {
        console.log("Connection established. Streaming logs...");
    });

    client.on("message", event => {
        console.log(event.toString());
    });
}

main();
