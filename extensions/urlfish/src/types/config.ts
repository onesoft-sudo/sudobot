import { GuildConfig } from "@sudobot/types/GuildConfigSchema";
import { zSnowflake } from "@sudobot/types/SnowflakeSchema";
import { z } from "zod";

export const Schema = z
    .object({
        enabled: z.boolean().default(false).describe("Whether or not URLFish is enabled"),
        channels: z
            .object({
                enabled_in: z.array(zSnowflake).describe("Channels to enable URLFish in")
            })
            .or(
                z.object({
                    disabled_in: z.array(zSnowflake).describe("Channels to disable URLFish in")
                })
            )
            .optional()
            .describe("Channels to enable or disable URLFish in"),
        log_channel: zSnowflake.optional().describe("Channel to log URLFish events to"),
        action: z
            .enum(["delete", "warn", "mute", "kick", "ban"])
            .default("delete")
            .describe("Action to take when a phishing URL is detected"),
        mute_duration: z
            .number()
            .positive()
            .min(1000)
            .optional()
            .describe("Duration to mute a user for when a phishing URL is detected"),
        infraction_reason: z.string().optional().describe("Reason to use when creating an infraction")
    })
    .describe("URLFish Configuration")
    .optional();

export type Config = z.infer<typeof Schema>;
export type GuildConfigForExtension = {
    urlfish: Config;
};
export type GuildConfigWithExtension = GuildConfig & GuildConfigForExtension;
export type ActionToTake = NonNullable<Config>["action"];
