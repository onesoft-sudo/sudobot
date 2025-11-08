import type Application from "@framework/app/Application";
import type Command from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import Singleton from "@framework/objects/Singleton";
import type { Awaitable } from "discord.js";
import { GuardStatusCode } from "./GuardStatusCode";
import type { GuardResolvable } from "./GuardResolvable";

abstract class Guard<in T extends Command = Command> extends Singleton {
    protected readonly application: Application;

    public constructor(application: Application) {
        super();
        this.application = application;
    }

    /**
     * Perform necessary checks.
     *
     * @param command The command for which this guard will perform checks.
     * @returns {boolean} Whether the check succeeded.
     * @throws {PermissionDeniedError} If missing permissions.
     */
    protected abstract check(command: T, context: Context): Awaitable<GuardStatusCode>;

    public async run(command: T, context: Context): Promise<GuardStatusCode> {
        const code = await this.check(command, context);
        return code;
    }

    public static async runGuards<T extends Command>(
        command: T,
        context: Context,
        guards: Iterable<GuardResolvable<T>>
    ) {
        for (const guard of guards) {
            const instance = typeof guard === "function" ? new guard(context.application) : guard;
            const code = await instance.run(command, context);

            switch (code) {
                case GuardStatusCode.Success:
                    continue;

                case GuardStatusCode.Failure:
                    return guard;

                case GuardStatusCode.Bail:
                    break;
            }
        }

        return null;
    }
}

export default Guard;
