import fs from "fs";
import fsPromises from "fs/promises";
import { randomSnowflake } from "./utils";

export const GUILD_ID = randomSnowflake();

const config = {
    guild: `
        {
            "${GUILD_ID}": {}
        }
    `,
    system: `
        {
            "system_admins": ["${randomSnowflake()}"]
        }
    `
};

export function setCustomGuildConfig(configJSON: string) {
    config.guild = configJSON;
}

export function setCustomSystemConfig(configJSON: string) {
    config.system = configJSON;
}

export function fileHandler(path: any) {
    if (path === configPath) {
        return config.guild;
    } else if (path === systemConfigPath) {
        return config.system;
    }
}

export const readFileSync = fs.readFileSync;
export const readFile = fsPromises.readFile;

export function registerFileHandler() {
    (fs as any).readFileSync = (path: string, ...args: [any]) =>
        path === configPath || path === systemConfigPath ? fileHandler(path) : readFileSync(path, ...args);
    (fsPromises as any).readFile = (path: string, ...args: [any]) =>
        path === configPath || path === systemConfigPath ? fileHandler(path) : readFile(path, ...args);
}

export function unregisterFileHandler() {
    (fs as any).readFileSync = readFileSync;
    (fsPromises as any).readFile = readFile;
}
