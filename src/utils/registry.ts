import path from 'path';
import { promises as fs } from 'fs';
import DiscordClient from '../client/Client';
import { registered } from './debug';

export async function registerCLICommands(client: DiscordClient, dir: string = '') {
    const filePath = path.join(__dirname, dir);
    const files = await fs.readdir(filePath);

    for (const file of files) {
        const stat = await fs.lstat(path.join(filePath, file));

        if (stat.isDirectory()) 
            await registerCLICommands(client, path.join(dir, file));
        
        if (file.endsWith('.js') || file.endsWith('.ts')) {
            const { default: Command } = await import(path.join(dir, file));
            const command = new Command();

            client.cliCommands.set(command.getName(), command);
            
            command.getAliases().forEach((alias: string) => {
                client.cliCommands.set(alias, command);
            });
        }
    }
}

export async function registerCommands(client: DiscordClient, dir: string = '') {
    const filePath = path.join(__dirname, dir);
    const files = await fs.readdir(filePath);

    for (const file of files) {
        const stat = await fs.lstat(path.join(filePath, file));

        if (stat.isDirectory()) 
            await registerCommands(client, path.join(dir, file));
        
        if (file.endsWith('.js') || file.endsWith('.ts')) {
            const startTime = Date.now();
            const { default: Command } = await import(path.join(dir, file));
            const command = new Command();

            client.commands.set(command.getName(), command);
            
            command.getAliases().forEach((alias: string) => {
                client.commands.set(alias, command);
            });

            const endTime = Date.now();

            registered(command, startTime, endTime);
        }
    }
}

export async function registerEvents(client: DiscordClient, dir: string = '') {
    const filePath = path.join(__dirname, dir);
    const files = await fs.readdir(filePath);
    
    for (const file of files) {
        const stat = await fs.lstat(path.join(filePath, file));

        if (stat.isDirectory())
            await registerEvents(client, path.join(dir, file));

        if (file.endsWith('.js') || file.endsWith('.ts')) {
            const startTime = Date.now();
            const { default: Event } = await import(path.join(dir, file));
            const event = new Event();
            client.events.set(event.getName(), event);
            client.on(event.getName(), event.run.bind(event, client));
            const endTime = Date.now();
            registered(event, startTime, endTime);
        }
    }
}
