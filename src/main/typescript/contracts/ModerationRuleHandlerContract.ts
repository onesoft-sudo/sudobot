import type { APIEmbed, Awaitable, GuildMember, Message } from "discord.js";
import type { MessageRuleType } from "../types/MessageRuleSchema";

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
