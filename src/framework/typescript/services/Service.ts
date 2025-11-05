import type Application from "@framework/app/Application";
import type { Awaitable } from "discord.js";

abstract class Service {
    protected readonly application: Application;
    public abstract readonly name: string;

    public constructor(application: Application) {
        this.application = application;
    }

    public boot?(): Awaitable<void>;
}

export default Service;
