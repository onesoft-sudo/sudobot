import Application from "@framework/app/Application";
import ClassLoader from "@framework/class/ClassLoader";
import Kernel from "@framework/core/Kernel";
import { Logger } from "@framework/log/Logger";
import { getEnvData } from "@main/env/env";
import { type Awaitable, Client, GatewayIntentBits, Partials } from "discord.js";
import path from "path";

class AppKernel extends Kernel {
    public override readonly client = this.createClient();
    public readonly logger = Logger.getLogger(AppKernel);

    public readonly aliases: Readonly<Record<string, string>> = {
        services: path.resolve(__dirname, "../services"),
        automod: path.resolve(__dirname, "../automod")
    };
    public readonly services: readonly string[] = ["@services/StartupManagerService"];

    private createClient(): Client {
        return new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ],
            partials: [Partials.Channel]
        });
    }

    private abort() {
        this.logger.fatal("Kernel boot aborted");
        process.exit(-1);
    }

    private registerFactories(application: Application): void {
        application.container.register({
            type: Logger,
            id: "logger",
            singleton: true,
            factory: () => application.logger
        });

        application.container.register({
            type: Application,
            id: "application",
            singleton: true,
            factory: () => application
        });

        application.container.register({
            type: AppKernel,
            id: "kernel",
            singleton: true,
            factory: () => this
        });

        application.container.register({
            type: Client,
            id: "client",
            singleton: true,
            factory: () => this.client
        });

        application.container.register({
            type: ClassLoader,
            id: "classLoader",
            singleton: true,
            factory: () => application.classLoader
        });
    }

    private async loadServices(application: Application): Promise<void> {
        await application.serviceManager.load(this.services, this.aliases);
    }

    public async boot(application: Application): Promise<void> {
        this.registerFactories(application);
        await this.loadServices(application);
    }

    public async run(application: Application): Promise<void> {
        application.logger.info("Login reached");
        await Promise.resolve();
        // await this.client.login(getEnvData().BOT_TOKEN);
    }
}

export default AppKernel;
