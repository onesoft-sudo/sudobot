import type Application from "@framework/app/Application";
import type { Client } from "discord.js";

abstract class Kernel {
    public abstract readonly client: Client;

    public abstract boot(application: Application): Promise<void>;
    public abstract run(application: Application): Promise<void>;
}

export default Kernel;
