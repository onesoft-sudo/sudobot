import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import Service from "../core/Service";

export const name = "configManager";

export const ConfigSchema = z.object({
    prefix: z.string(),
    mod_role: z.string().optional(),
    admin_role: z.string().optional()
});

export type Config = z.infer<typeof ConfigSchema>;

interface ConfigContainer {
    [guildID: string]: Config | undefined;
}

export default class ConfigManager extends Service {
    configPath = path.resolve(__dirname, "../../config/config.json");
    config: ConfigContainer = {} as ConfigContainer;

    async boot() {
        const configFileBuffer = await fs.readFile(this.configPath);
        this.config = JSON.parse(configFileBuffer.toString());
    }
}