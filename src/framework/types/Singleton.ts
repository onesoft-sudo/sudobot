import { Awaitable } from "discord.js";
import Container from "../container/Container";

type ThisType = {
    instance: Singleton | null;
    createInstance(): Promise<Singleton>;
    new (): Singleton;
};

export class Singleton {
    private static instance: Singleton | null = null;

    public static async getInstance<T = Singleton>(): Promise<T> {
        const self = this as unknown as ThisType;

        if (self.instance === null) {
            self.instance = await self.createInstance();
        }

        return self.instance as T;
    }

    protected static createInstance(): Awaitable<Singleton> {
        return new this() as Singleton;
    }
}

export class ContainerSingleton extends Singleton {
    protected static override createInstance(): Awaitable<ContainerSingleton> {
        return Container.getGlobalContainer().resolveByClass(this) as ContainerSingleton;
    }
}
