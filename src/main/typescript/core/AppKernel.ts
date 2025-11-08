import Application from "@framework/app/Application";
import ClassLoader from "@framework/class/ClassLoader";
import type Command from "@framework/commands/Command";
import Kernel from "@framework/core/Kernel";
import type EventListener from "@framework/events/EventListener";
import { Logger } from "@framework/log/Logger";
import type { Events } from "@framework/types/ClientEvents";
import type { DefaultExport } from "@framework/types/Utils";
import { getEnvData } from "@main/env/env";
import type CommandManagerService from "@main/services/CommandManagerService";
import { SERVICE_COMMAND_MANAGER } from "@main/services/CommandManagerService";
import type { ClientOptions } from "discord.js";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import path from "path";

export type AppKernelOptions = {
    shards?: number[];
    shardCount?: number;
};

class AppKernel extends Kernel {
    public readonly logger = Logger.getLogger(AppKernel);

    public readonly aliases: Readonly<Record<string, string>> = {
        services: path.resolve(__dirname, "../services"),
        automod: path.resolve(__dirname, "../automod")
    };
    public readonly services: readonly string[] = [
        "@services/StartupManagerService",
        "@services/ConfigurationManagerService",
        "@services/CommandManagerService"
    ];

    public readonly eventListenersDirectory: string = path.join(__dirname, "../events");
    public readonly commandsDirectory: string = path.join(__dirname, "../commands");

    public readonly shards?: number[];
    public readonly shardCount?: number;
    public override readonly client: Client<boolean>;

    public constructor(options?: AppKernelOptions) {
        super();
        this.shards = options?.shards;
        this.shardCount = options?.shardCount;
        this.client = this.createClient();
    }

    private createClient(): Client {
        const options: ClientOptions = {
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ],
            partials: [Partials.Channel]
        };

        if (this.shards && this.shardCount) {
            options.shards = this.shards;
            options.shardCount = this.shardCount;
        }

        return new Client(options);
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

    private async loadEventListeners(application: Application): Promise<void> {
        await application.classLoader.loadClassesRecursive<
            DefaultExport<new (application: Application) => EventListener<Events>>
        >(this.eventListenersDirectory, {
            preLoad: filepath => {
                application.logger.debug("Loading event listener: ", path.basename(filepath).replace(/\..*$/, ""));
            },
            postLoad: async (filepath, { default: EventListenerClass }) => {
                const eventListener = application.container.get(EventListenerClass, {
                    constructorArgs: [application]
                });
                await eventListener.onAppBoot?.();
                this.client.on(eventListener.type as never, eventListener.onEvent.bind(eventListener));
                application.logger.info("Loaded event listener: ", path.basename(filepath).replace(/\..*$/, ""));
            }
        });
    }

    private async loadCommands(application: Application): Promise<void> {
        await application.classLoader.loadClassesRecursive<DefaultExport<new (application: Application) => Command>>(
            this.commandsDirectory,
            {
                preLoad: filepath => {
                    application.logger.debug("Loading command: ", path.basename(filepath).replace(/\..*$/, ""));
                },
                postLoad: async (filepath, { default: CommandClass }) => {
                    const command = application.container.get(CommandClass, {
                        constructorArgs: [application]
                    });
                    await command.onAppBoot?.();
                    const commandManagerService = application.serviceManager.services.get(SERVICE_COMMAND_MANAGER) as
                        | CommandManagerService
                        | undefined;
                    commandManagerService?.register(command);
                    application.logger.info(
                        `Loaded command: ${command.name} (${path.basename(filepath).replace(/\..*$/, "")})`
                    );
                }
            }
        );
    }

    public async boot(application: Application): Promise<void> {
        this.registerFactories(application);
        await this.loadServices(application);
        await this.loadEventListeners(application);
        await this.loadCommands(application);
    }

    public async run(_application: Application): Promise<void> {
        await Promise.resolve();
        await this.client.login(getEnvData().SUDOBOT_TOKEN);
    }
}

export default AppKernel;
