import type Command from "@framework/commands/Command.js";
import type Context from "@framework/commands/Context.js";
import type { CommandRateLimitConfiguration } from "@framework/security/CommandRateLimitConfiguration.js";
import TimeBasedCommandRateLimiter from "@framework/security/TimeBasedCommandRateLimiter.js";
import type ConfigurationManagerService from "@main/services/ConfigurationManagerService.js";
import { ConfigurationType } from "@main/services/ConfigurationManagerService.js";

class AppCommandRateLimiter extends TimeBasedCommandRateLimiter {
    private readonly configurationManagerService: ConfigurationManagerService;

    public constructor(
        defaultConfig: CommandRateLimitConfiguration,
        configurationManagerService: ConfigurationManagerService
    ) {
        super(defaultConfig);
        this.configurationManagerService = configurationManagerService;
    }

    public override async initializeLocalHit(command: Command, context: Context) {
        const hit = await super.initializeLocalHit(command, context);
        const config = await this.configurationManagerService.get(
            context.inGuild() ? ConfigurationType.Guild : ConfigurationType.DirectMessage,
            context.guildId ?? context.channelId
        );

        const ratelimitConfig = config.commands?.ratelimits?.table[command.name];

        hit.config = ratelimitConfig
            ? {
                  maxhits: ratelimitConfig.maxhits,
                  timeframe: ratelimitConfig.timeframe
              }
            : hit.config;

        return hit;
    }

    public override async initializeGlobalHit(command: Command) {
        const hit = await super.initializeGlobalHit(command);
        const ratelimitConfig = this.configurationManagerService.systemConfig.commands?.ratelimits?.table[command.name];

        hit.config = ratelimitConfig
            ? {
                  maxhits: ratelimitConfig.maxhits,
                  timeframe: ratelimitConfig.timeframe
              }
            : hit.config;

        return hit;
    }
}

export default AppCommandRateLimiter;
