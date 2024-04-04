import { Message, Snowflake } from "discord.js";
import { AutoModServiceContract } from "../contracts/AutoModServiceContract";
import { Service } from "../framework/services/Service";
import type ConfigurationManager from "../services/ConfigurationManager";
import { Inject } from "../framework/container/Inject";

class SpamModerationService extends Service implements AutoModServiceContract {
    @Inject("configManager")
    private readonly configurationManager!: ConfigurationManager;

    private configFor(guildId: Snowflake) {
        return this.configurationManager.config[guildId!]?.antispam;
    }

    private shouldModerate(message: Message) {
        return !message.author.bot && this.configFor(message.guildId!)?.enabled;
    }

    public async moderate(message: Message): Promise<void> {
        if (!this.shouldModerate(message)) {
            return;
        }

        const _config = this.configFor(message.guildId!);

        // TODO: Implement spam moderation
    }
}

export default SpamModerationService;
