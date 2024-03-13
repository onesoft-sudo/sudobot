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

import { User } from "discord.js";
import { logError } from "../../components/io/Logger";
import Command, { CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class DMHistoryCommand extends Command {
    public readonly name = "dmhistory";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [];

    public readonly aliases = ["sendmodhistory", "sendmodlogs", "dmmodlogs"];
    public readonly description =
        "Generates a file that contains your infraction history, and sends it to you via DM.";

    async execute(message: CommandMessage): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const { buffer, count } = await this.client.infractionManager.createInfractionHistoryBuffer(
            message.member!.user,
            message.guild!
        );

        if (!buffer) {
            await this.deferredReply(message, "You don't have any infractions.");
            return;
        }

        try {
            await (message.member!.user as User).send({
                content:
                    "We've generated your moderation history. The attached text file contains your moderation history.\nDownload the attached text file below to see your infractions.",
                files: [
                    {
                        attachment: buffer,
                        name: `history-${message.member!.user.username}.txt`
                    }
                ]
            });
        } catch (e) {
            logError(e);
            await this.error(
                message,
                "The system could not deliver a DM to you. Maybe you're not accepting DMs from me or this server?"
            );
            return;
        }

        await this.deferredReply(message, {
            content: `${this.emoji(
                "check"
            )} The system has sent you a DM. Sent ${count} records total.`
        });
    }
}
