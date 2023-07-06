import { ChatInputCommandInteraction, Message } from "discord.js";
import Service from "../core/Service";
import { Config } from "./ConfigManager";

export const name = "commandManager";

export interface CommandContext {
    isLegacy: boolean;
    config: Config;
}

export interface LegacyCommandContext extends CommandContext {
    isLegacy: true;
    argv: string[];
    args: string[];
    has(arg: string): boolean;
    getOptionValue(option: string): string | undefined;
}

export interface ChatInputCommandContext extends CommandContext {
    isLegacy: false;
}

export default class CommandManager extends Service {
    public async runCommandFromMessage(message: Message) {
        if (!message.content)
            throw new Error("Invalid message content");

        const config = this.client.configManager.config[message.guildId!];

        if (!config) {
            return;
        }

        const commandText = message.content.substring(config.prefix.length);
        const [commandName, ...commandArguments] = commandText
            .split(/ +/);

        const command = this.client.commands.get(commandName);

        if (!command) {
            return false;
        }

        command.run(message, <LegacyCommandContext>{
            isLegacy: true,
            argv: [commandName, ...commandArguments],
            args: commandArguments,
            config,
            has(arg: string) {
                return this.args.includes(arg);
            },
        })
            .then(result => {
                if (result && typeof result === 'object' && "__reply" in result && result.__reply === true) {
                    message.reply(result as any).catch(console.error);
                }
            })
            .catch(console.error);

        return true;
    }

    public async runCommandFromChatInputCommandInteraction(interaction: ChatInputCommandInteraction) {
        const config = this.client.configManager.config[interaction.guildId!];

        if (!config) {
            return;
        }

        const { commandName } = interaction;
        const command = this.client.commands.get(commandName);

        if (!command) {
            return false;
        }

        command.run(interaction, {
            isLegacy: false,
            config
        })
            .then(result => {
                if (result && typeof result === 'object' && "__reply" in result && result.__reply === true) {
                    interaction.reply(result as any).catch(console.error);
                }
            })
            .catch(console.error);
    }
}