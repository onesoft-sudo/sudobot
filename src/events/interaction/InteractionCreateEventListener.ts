import { CacheType, Interaction } from "discord.js";
import { Inject } from "../../framework/container/Inject";
import EventListener from "../../framework/events/EventListener";
import { Events } from "../../framework/types/ClientEvents";
import type CommandManager from "../../services/CommandManager";

class InteractionCreateEventListener extends EventListener<Events.InteractionCreate> {
    public override readonly name = Events.InteractionCreate;

    @Inject("commandManager")
    private readonly commandManager!: CommandManager;

    public override async execute(interaction: Interaction): Promise<void> {
        if (interaction.isCommand()) {
            await this.commandManager.runCommandFromInteraction(interaction);
        }
    }
}

export default InteractionCreateEventListener;
