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

import axios, { AxiosError } from "axios";
import Command, { AnyCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/logger";

export default class DogCommand extends Command {
    public readonly name = "dog";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [];

    public readonly description = "Fetch a random doggy image";

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        if (!process.env.DOG_API_TOKEN) {
            await this.error(message, "Dog API token is not set. Please ask the system administrator to set the token.");
            return;
        }

        await this.deferIfInteraction(message);

        try {
            const response = await axios.get("https://api.thedogapi.com/v1/images/search", {
                headers: {
                    "x-api-key": process.env.DOG_API_TOKEN
                }
            });

            if (response.status < 200 || response.status >= 300) throw new Error("Invalid status code");

            await this.deferredReply(message, {
                files: [
                    {
                        attachment: response.data?.[0]?.url
                    }
                ]
            });
        } catch (e) {
            logError(e);
            await this.error(
                message,
                (e as AxiosError).response?.status === 429
                    ? "Too many requests at the same time, please try again later"
                    : "Failed to fetch a cat image"
            );
        }
    }
}
