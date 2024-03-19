import APIServer from "../framework/api/APIServer";
import { Inject } from "../framework/container/Inject";
import EventListener from "../framework/events/EventListener";
import { Events } from "../framework/types/ClientEvents";
import ConfigurationManager from "../services/ConfigurationManager";
import LogStreamingService from "../services/LogStreamingService";
import StartupManager from "../services/StartupManager";

class ReadyEventListener extends EventListener<Events.Ready> {
    public override readonly name = Events.Ready;

    @Inject()
    public readonly configManager!: ConfigurationManager;

    @Inject()
    public readonly startupManager!: StartupManager;

    @Inject()
    public readonly server!: APIServer;

    @Inject()
    public readonly logStreamingService!: LogStreamingService;

    public override async execute() {
        this.client.logger.info(`Logged in as: ${this.client.user?.username}`);

        this.configManager.onReady();
        this.startupManager.onReady();
        await this.server.onReady();

        // FIXME
        // this.client.queueManager.onReady().catch(logError);

        const homeGuild = await this.client.getHomeGuild();

        if (this.configManager.systemConfig.sync_emojis) {
            try {
                const emojis = await homeGuild.emojis.fetch();

                for (const [id, emoji] of emojis) {
                    if (!this.client.emojis.cache.has(id)) {
                        this.client.emojis.cache.set(id, emoji);
                    }
                }

                this.client.logger.info("Successfully synced the emojis of home guild.");
            } catch (e) {
                this.client.logger.error(e);
                this.client.logger.warn(
                    "Failed to fetch some of the emojis. The bot may not show some of the emojis in it's responses."
                );
            }
        }

        if (this.configManager.systemConfig.log_server?.auto_start) {
            this.logStreamingService.listen();
        }
    }
}

export default ReadyEventListener;
