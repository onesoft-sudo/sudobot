import { Awaitable, User } from "discord.js";
import { OptionalRecord } from "../types/OptionalRecord";
import { ContainerSingleton } from "../types/Singleton";

declare global {
    interface PolicyActions {
        "": [];
    }
}

export type Action = keyof PolicyActions;

interface PolicyLike {
    new (): Policy;
    [method: `can${string}`]: ((action: Action, user: User) => Awaitable<boolean>) | undefined;
}

class Policy extends ContainerSingleton {
    protected static readonly methods: OptionalRecord<keyof PolicyActions, string | undefined> = {};

    public static async can<K extends Exclude<keyof PolicyActions, number>>(
        action: K,
        user: User,
        ...args: PolicyActions[K]
    ): Promise<boolean> {
        const methodName =
            this.methods[action] ?? `can${action[0].toUpperCase()}${action.slice(1)}`;
        const instance = this.getInstance() as unknown as PolicyLike & Policy;

        if (methodName in instance) {
            const method = instance[
                methodName as keyof typeof instance
            ] as PolicyLike[keyof PolicyLike];
            return !!(await method?.call(instance, action, user, ...(args as [])));
        }

        return false;
    }

    public boot?(): Awaitable<void>;

    protected static override async createInstance(this: new () => Policy): Promise<Policy> {
        const instance = (await super.createInstance()) as Policy;
        await instance.boot?.();
        return instance;
    }
}

export { Policy };
