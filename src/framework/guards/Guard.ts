import { Awaitable } from "discord.js";
import type { Command } from "../commands/Command";
import { ContextOf } from "../commands/Context";
import { ContextType } from "../commands/ContextType";
import Container from "../container/Container";
import { GuardLike } from "./GuardLike";

abstract class Guard implements GuardLike {
    private static instance: Guard | null = null;

    public static async getInstance(): Promise<Guard> {
        if (!this.instance) {
            this.instance = Container.getGlobalContainer().resolveByClass(
                this as unknown as new () => Guard
            );
            await this.instance.boot?.();
        }

        return this.instance;
    }

    public boot?(): Awaitable<void>;
    public abstract check<T extends Command<ContextType>>(
        command: T,
        context: ContextOf<T>
    ): Awaitable<boolean>;
}

export { Guard };
