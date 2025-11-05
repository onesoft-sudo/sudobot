import type Application from "@framework/app/Application";
import type { Awaitable, Client } from "discord.js";

abstract class Kernel {
    public abstract readonly client: Client;

    public abstract boot(application: Application): Awaitable<void>;
    public abstract run(application: Application): Awaitable<void>;
}

export default Kernel;
