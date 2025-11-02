import type Kernel from "@framework/core/Kernel";
import { Logger } from "@framework/log/Logger";
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

    public get client(): Client {
        throw new TypeError("Client is not available yet");
    }

    public constructor(options: ApplicationOptions) {
        this.rootDirectoryPath = options.rootDirectoryPath;
        this.projectRootDirectoryPath = options.projectRootDirectoryPath;
        this.version = options.version;
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
