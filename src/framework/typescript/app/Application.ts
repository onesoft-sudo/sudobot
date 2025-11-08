import ClassLoader from "@framework/class/ClassLoader";
import Container, { type ConstructorOf } from "@framework/container/Container";
import type Kernel from "@framework/core/Kernel";
import { Logger } from "@framework/log/Logger";
import type Service from "@framework/services/Service";
import ServiceManager from "@framework/services/ServiceManager";
import type { Client } from "discord.js";

export type ApplicationOptions = {
    rootDirectoryPath: string;
    projectRootDirectoryPath: string;
    version: string;
    shards?: number[];
    shardCount?: number;
};

class Application {
    public readonly rootDirectoryPath: string;
    public readonly projectRootDirectoryPath: string;
    public readonly version: string;
    public readonly logger = Logger.getLogger(Application);

    public readonly container: Container;
    public readonly classLoader: ClassLoader;
    public readonly serviceManager: ServiceManager;

    public readonly shards: number[] = [];
    public readonly shardCount: number = 1;

    private static _self: Application;

    public get client(): Client {
        throw new TypeError("Client is not available yet");
    }

    public constructor(options: ApplicationOptions) {
        this.rootDirectoryPath = options.rootDirectoryPath;
        this.projectRootDirectoryPath = options.projectRootDirectoryPath;
        this.version = options.version;
        this.shardCount = options.shardCount ?? 1;
        this.shards = options.shards ? [...options.shards] : [];
        this.container = new Container();
        this.classLoader = new ClassLoader();
        this.serviceManager = new ServiceManager(this);

        Application._self = this;
    }

    public static current() {
        return Application._self;
    }

    public async run(kernel: Kernel) {
        await kernel.boot(this);

        Object.defineProperty(this, "client", {
            value: kernel.client
        });

        await kernel.run(this);
    }

    public static setupGlobals() {}

    public service<T extends Service>(service: ConstructorOf<T>): T;
    public service<T extends Service>(name: string): T;

    public service<T extends Service>(service: ConstructorOf<T> | string): T {
        return this.serviceManager.get<T>(service as ConstructorOf<T>);
    }
}

export default Application;
