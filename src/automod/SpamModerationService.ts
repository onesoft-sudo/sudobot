import { Collection, Message, Snowflake, TextChannel } from "discord.js";
import { AutoModServiceContract } from "../contracts/AutoModServiceContract";
import { Inject } from "../framework/container/Inject";
import { Service } from "../framework/services/Service";
import { HasEventListeners } from "../framework/types/HasEventListeners";
import type ConfigurationManager from "../services/ConfigurationManager";
import type ModerationActionService from "../services/ModerationActionService";

type Cache = {
    timestamps: number[];
    timeout: ReturnType<typeof setTimeout> | null;
};

class SpamModerationService extends Service implements AutoModServiceContract, HasEventListeners {
    private readonly cache = new Collection<`${Snowflake}_${Snowflake}`, Cache>();

    @Inject("configManager")
    private readonly configurationManager!: ConfigurationManager;

    @Inject("moderationActionService")
    private readonly moderationActionService!: ModerationActionService;

    private configFor(guildId: Snowflake) {
        return this.configurationManager.config[guildId!]?.antispam;
    }

    private shouldModerate(message: Message) {
        return !message.author.bot && this.configFor(message.guildId!)?.enabled;
    }

    public onMessageCreate(message: Message<boolean>) {
        const config = this.configFor(message.guildId!);

        if (!config?.enabled) {
            return;
        }

        const includes = config.channels.list.includes(message.channelId);

        if (
            (config.channels.mode === "exclude" && includes) ||
            (config.channels.mode === "include" && !includes)
        ) {
            return;
        }

        return this.moderate(message);
    }

    public async moderate(message: Message): Promise<void> {
        if (!this.shouldModerate(message)) {
            return;
        }

        const config = this.configFor(message.guildId!)!;
        const cache = this.cache.get(`${message.guildId!}_${message.author.id}`) ?? ({} as Cache);

        cache.timestamps ??= [];
        cache.timestamps.push(Date.now());

        if (!cache.timeout) {
            cache.timeout = setTimeout(() => {
                const delayedInfo =
                    this.cache.get(`${message.guildId!}_${message.author.id}`) ?? ({} as Cache);
                const timestamps = delayedInfo.timestamps.filter(
                    timestamp => (config?.timeframe ?? 0) + timestamp >= Date.now()
                );

                if (timestamps.length >= (config?.limit ?? 0)) {
                    this.takeAction(message).catch(console.error);
                }

                this.cache.delete(`${message.guildId!}_${message.author.id}`);
            }, config.timeframe);
        }

        this.cache.set(`${message.guildId!}_${message.author.id}`, cache);
    }

    private async takeAction(message: Message) {
        const config = this.configFor(message.guildId!)!;
        const actions = config.actions.map(action => ({
            ...action,
            reason: "reason" in action && action.reason ? "Spam detected" : undefined
        }));

        await this.moderationActionService.takeActions(
            message.guild!,
            message.member!,
            actions,
            message.channel as TextChannel
        );
    }
}

export default SpamModerationService;
