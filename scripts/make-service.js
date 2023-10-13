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

const fs = require("fs");
const path = require("path");

if (process.argv.length < 3) {
    console.log("A service name and type is required to generate!");
    process.exit(-1);
}

if (process.argv.length < 4) {
    console.log("A service name is required to generate!");
    process.exit(-1);
}

if (process.argv[2] !== "automod" && process.argv[2] !== "services") {
    console.log("Invalid service type!");
    process.exit(-1);
}

const template = `/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-${new Date().getFullYear()} OSN Developers.
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

import Service from "../core/Service";

export const name = "%NAME_LOWERCASE%"; 

export default class %NAME%Service extends Service {
    
}
`
    .replace("%NAME%", process.argv[3])
    .replace("%NAME_LOWERCASE%", process.argv[3].toLowerCase());

fs.writeFileSync(
    path.join(
        __dirname,
        fs.existsSync(path.join(__dirname, "src")) ? "." : "..",
        "src",
        process.argv[2],
        process.argv[3] + "Service.ts"
    ),
    template
);
console.log("Successfully created: ", process.argv[3] + "Service");
