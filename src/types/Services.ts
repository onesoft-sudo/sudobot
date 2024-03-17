import type APIServer from "../framework/api/APIServer";
import type { ServiceManager } from "../framework/services/ServiceManager";
import type CommandManager from "../services/CommandManager";
import type ConfigurationManager from "../services/ConfigurationManager";
import type ExtensionManager from "../services/ExtensionManager";
import type LogStreamingService from "../services/LogStreamingService";
import type StartupManager from "../services/StartupManager";

export interface Services {
    commandManager: CommandManager;
    configManager: ConfigurationManager;
    extensionManager: ExtensionManager;
    logStreamingService: LogStreamingService;
    apiServer: APIServer;
    startupManager: StartupManager;
    serviceManager: ServiceManager;
}
