/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { env } from "@main/env/env";
import { getAxiosClient } from "@main/utils/axios";
import type { AxiosError } from "axios";

class CatCommand extends Command {
    public override readonly name = "cat";
    public override readonly description: string = "Fetch a random cat image.";
    public override readonly usage = [""];
    public override readonly systemPermissions = [];

    public override async execute(context: Context): Promise<void> {
        const token = env.CAT_API_TOKEN;

        if (!token) {
            return void (await context.error("No cat API token found."));
        }

        await context.defer();

        try {
            const response = await getAxiosClient().get(
                "https://api.thecatapi.com/v1/images/search",
                {
                    headers: {
                        "x-api-key": token
                    }
                }
            );

            if (response.status !== 200) {
                throw new Error("Invalid response status code.");
            }

            await context.reply({
                files: [
                    {
                        attachment: response.data?.[0]?.url
                    }
                ]
            });
        } catch (error) {
            await context.error(
                (error as AxiosError).response?.status === 429
                    ? "Too many requests at the same time, please try again later"
                    : "Failed to fetch cat image: the API returned an invalid response."
            );
        }
    }
}

export default CatCommand;
