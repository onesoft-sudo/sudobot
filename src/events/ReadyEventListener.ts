import APIServer from "../components/api/APIServer";
import EventListener from "../components/events/EventListener";
import { Events } from "../components/utils/ClientEvents";
import ConfigurationManager from "../services/ConfigurationManager";
import LogStreamingService from "../services/LogStreamingService";
import StartupManager from "../services/StartupManager";

class ReadyEventListener extends EventListener<Events.Ready> {
    public override readonly name = Events.Ready;

    public override async execute() {
        this.client.logger.info(`Logged in as: ${this.client.user?.username}`);

        this.client.getService(ConfigurationManager).onReady();
        this.client.getService(StartupManager).onReady();
        await this.client.getService(APIServer).onReady();
        // this.client.queueManager.onReady().catch(logError);
        const homeGuild = await this.client.getHomeGuild();

        if (this.client.getService(ConfigurationManager).systemConfig.sync_emojis) {
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

        if (this.client.getService(ConfigurationManager).systemConfig.log_server?.auto_start) {
            this.client.getService(LogStreamingService).listen();
        }
    }
}

export default ReadyEventListener;
