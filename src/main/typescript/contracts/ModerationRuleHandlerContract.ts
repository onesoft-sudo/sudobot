import type { APIEmbed, Awaitable, GuildMember, Message } from "discord.js";
import type { MessageRuleType } from "../types/MessageRuleSchema";

type HandlerRecord = {
    [K in MessageRuleType["type"]]: Handler;
};

export type MessageRuleContextSpecific = {
    message: {
        message: Message;
    };
    profile: {
        member: GuildMember;
    };
};
export type MessageRuleContextType = "message" | "profile";
export type MessageRuleContext<
    T extends MessageRuleContextType = MessageRuleContextType,
    U = MessageRuleType
> = {
    rule: Extract<MessageRuleType, U>;
    type: T;
} & MessageRuleContextSpecific[T];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler = (context: MessageRuleContext<any, any>) => Awaitable<RuleExecResult>;
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
