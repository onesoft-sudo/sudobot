import ClassLoader from "@framework/class/ClassLoader";
import Container from "@framework/container/Container";
import type Kernel from "@framework/core/Kernel";
import { Logger } from "@framework/log/Logger";
import ServiceManager from "@framework/services/ServiceManager";
import type { Client } from "discord.js";

export type ApplicationOptions = {
    rootDirectoryPath: string;
    projectRootDirectoryPath: string;
    version: string;
};

class Application {
    public readonly rootDirectoryPath: string;
    public readonly projectRootDirectoryPath: string;
    public readonly version: string;
    public readonly logger = Logger.getLogger(Application);

    public readonly container: Container;
    public readonly classLoader: ClassLoader;
    public readonly serviceManager: ServiceManager;

    private static _self: Application;

    public get client(): Client {
        throw new TypeError("Client is not available yet");
    }

    public constructor(options: ApplicationOptions) {
        this.rootDirectoryPath = options.rootDirectoryPath;
        this.projectRootDirectoryPath = options.projectRootDirectoryPath;
        this.version = options.version;
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
}

export default Application;
