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

const fs = require("fs/promises");
const path = require("path");
const { existsSync } = require("fs");

const sourceDirectory = path.join(
    __dirname,
    existsSync(path.join(__dirname, "src")) ? "." : "../src"
);

const licenseComment = `/*
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
*/`;

async function addLicenseComment(directory = sourceDirectory) {
    const files = await fs.readdir(directory);

    for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = await fs.lstat(filePath);

        if (stat.isDirectory()) {
            await addLicenseComment(filePath);
            continue;
        }

        if (!file.endsWith(".ts")) {
            continue;
        }

        const fileContents = await fs.readFile(filePath, { encoding: "utf-8" });

        if (fileContents.trim().startsWith("/*")) continue;

        console.log("Modifying: ", filePath);
        await fs.writeFile(filePath, `${licenseComment}\n\n${fileContents}`);
    }
}

addLicenseComment();
