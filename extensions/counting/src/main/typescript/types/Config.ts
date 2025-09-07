import { GuildConfig } from "@sudobot/schemas/GuildConfigSchema";
import { CountingConfig } from "../schemas/CountingConfigSchema";

export type ExtendedGuildConfig = GuildConfig & { counting: CountingConfig };