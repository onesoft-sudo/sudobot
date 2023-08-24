import "reflect-metadata";

declare global {
    var configPath: string;
    var systemConfigPath: string;
}

process.env.DEBUG = "0";
process.env.SUDO_ENV = "testing";
process.env.NODE_ENV = undefined;
process.env.SUDO_PREFIX = "/app";

global.configPath = `${process.env.SUDO_PREFIX}/config/config.json`;
global.systemConfigPath = `${process.env.SUDO_PREFIX}/config/system.json`;
