import Command from "@framework/commands/Command";
import { Inject } from "@framework/container/Inject";
import Service from "@framework/services/Service";
import { Collection, Message } from "discord.js";
import ConfigurationManagerService from "./ConfigurationManagerService";

export const SERVICE_COMMAND_MANAGER = "commandManagerService" as const;

class CommandManagerService extends Service {
    public override readonly name: string = SERVICE_COMMAND_MANAGER;
    public readonly commands = new Collection<string, Command>();

    public register(command: Command) {
        this.commands.set(command.name, command);

        for (const alias of command.aliases) {
            this.commands.set(alias, command);
        }
    }

    @Inject()
    private readonly configurationManagerService!: ConfigurationManagerService;

    public run(message: Message): Promise<boolean>;

    public async run(message: Message): Promise<boolean> {
        if (message instanceof Message) {
            const config = await this.configurationManagerService.get(message.guildId!);
            console.log(config);
            return false;
        }

        return false;
    }
}

export default CommandManagerService;
