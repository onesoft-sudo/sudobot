import { PrismaClient } from '@prisma/client';
import { Collection, Client as DiscordClient } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import CommandManager from '../services/CommandManager';
import ConfigManager from '../services/ConfigManager';
import InfractionManager from '../services/InfractionManager';
import Command from './Command';
import ServiceManager from './ServiceManager';

export default class Client extends DiscordClient {
    aliases = {
        "@services": path.resolve(__dirname, "../services")
    };

    services = [
        "@services/ConfigManager",
        "@services/CommandManager",
        "@services/InfractionManager",
    ];

    commandsDirectory = path.resolve(__dirname, "../commands");
    eventsDirectory = path.resolve(__dirname, "../events");

    serviceManager = new ServiceManager(this);

    configManager: ConfigManager = {} as ConfigManager;
    commandManager: CommandManager = {} as CommandManager;
    infractionManager: InfractionManager = {} as InfractionManager;
    prisma = new PrismaClient({
        errorFormat: "pretty",
        log: ['query', 'error', 'info', 'warn']
    });

    commands = new Collection<string, Command>();

    async boot() {
        await this.serviceManager.loadServices();
    }

    async loadCommands(directory = this.commandsDirectory) {
        const files = await fs.readdir(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const isDirectory = (await fs.lstat(filePath)).isDirectory();

            if (isDirectory) {
                await this.loadCommands(filePath);
                continue;
            }

            if (!file.endsWith('.ts')) {
                continue;
            }

            const { default: Command } = await import(filePath);
            const command = new Command(this);
            this.commands.set(command.name, command);

            for (const alias of command.aliases) {
                this.commands.set(alias, command);
            }

            console.log('Loaded command: ', command.name);
        }
    }

    async loadEvents(directory = this.eventsDirectory) {
        const files = await fs.readdir(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const isDirectory = (await fs.lstat(filePath)).isDirectory();

            if (isDirectory) {
                await this.loadEvents(filePath);
                continue;
            }

            if (!file.endsWith('.ts')) {
                continue;
            }

            const { default: Event } = await import(filePath);
            const event = new Event(this);
            this.on(event.name, event.execute.bind(event));
        }
    }
}