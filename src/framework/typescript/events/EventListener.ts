import type Application from "@framework/app/Application";
import type { ArgsOfEventListener, Events } from "@framework/types/ClientEvents";
import type { Awaitable } from "discord.js";

abstract class EventListener<T extends Events> {
    public abstract readonly type: T;
    protected readonly application: Application;

    public constructor(application: Application) {
        this.application = application;
    }

    public abstract onEvent(...args: ArgsOfEventListener<T>): Awaitable<void>;
    public onAppBoot?(): Awaitable<void>;
}

export default EventListener;
