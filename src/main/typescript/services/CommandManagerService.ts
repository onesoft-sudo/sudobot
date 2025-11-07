import Command from "@framework/commands/Command";
import { Inject } from "@framework/container/Inject";
import Service from "@framework/services/Service";
import { ChatInputCommandInteraction, Collection, ContextMenuCommandInteraction, Message } from "discord.js";
import ConfigurationManagerService from "./ConfigurationManagerService";
import CommandContextType from "@framework/commands/CommandContextType";
import LegacyContext from "@framework/commands/LegacyContext";
import { CommandMode } from "@framework/commands/CommandMode";
import InteractionContext from "@framework/commands/InteractionContext";

export const SERVICE_COMMAND_MANAGER = "commandManagerService" as const;

class CommandManagerService extends Service {
    public override readonly name: string = SERVICE_COMMAND_MANAGER;
    public readonly commands = new Collection<string, Command>();

    @Inject()
    private readonly configurationManagerService!: ConfigurationManagerService;

    public register(command: Command) {
        this.commands.set(command.name, command);

        for (const alias of command.aliases) {
            this.commands.set(alias, command);
        }
    }

    public run(message: Message | ChatInputCommandInteraction | ContextMenuCommandInteraction): Promise<boolean> {
        if (message instanceof Message) {
            return this.runFromMessage(message);
        }

        return this.runFromInteraction(message);
    }

    private async runFromMessage(message: Message): Promise<boolean> {
        const config = await this.configurationManagerService.get(message.guildId || message.author.id);
        const prefix = config.commands?.prefix || "-";

        if (!message.content?.startsWith(prefix)) {
            return false;
        }

        const argv = message.content.slice(prefix.length).split(/\s+/);
        const [commandName, ...args] = argv;
        const command = this.commands.get(commandName);

        if (
            !command ||
            !command.contexts.includes(CommandContextType.Legacy) ||
            !command.modes.includes(message.inGuild() ? CommandMode.Guild : CommandMode.Direct)
        ) {
            return false;
        }

        await command.run(new LegacyContext(this.application, message, commandName, argv, args));
        return true;
    }

    private async runFromInteraction(
        interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction
    ): Promise<boolean> {
        const command = this.commands.get(interaction.commandName);

        if (
            !command ||
            !command.contexts.includes(CommandContextType.Legacy) ||
            !command.modes.includes(interaction.inGuild() ? CommandMode.Guild : CommandMode.Direct)
        ) {
            return false;
        }

        await command.run(new InteractionContext(this.application, interaction));
        return true;
    }
}

export default CommandManagerService;
