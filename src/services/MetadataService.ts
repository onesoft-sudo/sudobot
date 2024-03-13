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

import packageJson from "../../package.json";
import { log } from "../components/io/Logger";
import Service from "../core/Service";

export const name = "metadata";

export default class MetadataService extends Service {
    public data: typeof packageJson = packageJson;

    async boot() {
        // this.data = await FileSystem.readFileContents<(typeof this)["data"], true>(
        //     path.resolve(__dirname, "../../package.json"),
        //     {
        //         json: true
        //     }
        // );

        log("Successfully loaded system metadata from package.json file");
    }
}
