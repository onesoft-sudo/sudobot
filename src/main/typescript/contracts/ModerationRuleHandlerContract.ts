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

import type { APIEmbed, Awaitable, GuildMember, Message } from "discord.js";
import type { MessageRuleType } from "../schemas/MessageRuleSchema";

type HandlerRecord = {
    [K in MessageRuleType["type"]]: Handler;
};

export enum MessageRuleScope {
    Content,
    Embed,
    Attachments
}

export type ModerationRuleContextSpecific = {
    message: {
        message: Message;
    };
    profile: {
        member: GuildMember;
    };
};
export type ModerationRuleContextType = "message" | "profile";
export type ModerationRuleContext<
    T extends ModerationRuleContextType = ModerationRuleContextType,
    U = MessageRuleType
> = {
    rule: Extract<MessageRuleType, U>;
    type: T;
} & ModerationRuleContextSpecific[T];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler = (context: ModerationRuleContext<any, any>) => Awaitable<RuleExecResult>;
export type RuleExecResult = {
    matched: boolean;
    reason?: string;
    logEmbed?: APIEmbed;
    fields?: APIEmbed["fields"];
};

interface ModerationRuleHandlerContract extends HandlerRecord {
    boot?(): Awaitable<void>;
}

export default ModerationRuleHandlerContract;
