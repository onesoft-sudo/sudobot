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

import axios from "axios";
import Command, { AnyCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/logger";

export default class EncourageCommand extends Command {
    public readonly name = "encourage";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [];
    public readonly aliases = ["quote", "inspire"];

    public readonly description = "Show inspirational quotes.";
    public readonly beta = true;
    protected readonly url = "https://zenquotes.io/api/random";

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        try {
            const response = await axios.get(this.url);

            if (response.data.error || response.data.length === 0) {
                throw new Error();
            }

            const [quote] = response.data;

            await this.deferredReply(message, `> ${quote.q.replace(/\n/gi, "\n> ")}\n\n — *${quote.a}*`);
        } catch (e) {
            logError(e);
            await this.error(message, "The API did not return a valid status code. This is a possible error in the API or you got ratelimited.");
        }
    }
}
