import { Awaitable } from "discord.js";
import { Command } from "../commands/Command";
import { ContextOf } from "../commands/Context";
import { ContextType } from "../commands/ContextType";

export interface GuardLike {
    check<T extends Command<ContextType>>(command: T, context: ContextOf<T>): Awaitable<boolean>;
}
