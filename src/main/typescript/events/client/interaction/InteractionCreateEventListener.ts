import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import CommandManagerService from "@main/services/CommandManagerService";
import { Awaitable, Interaction } from "discord.js";

class InteractionCreateEventListener extends EventListener<Events.InteractionCreate> {
    public override readonly type = Events.InteractionCreate;

    @Inject()
    private readonly commandManagerService!: CommandManagerService;

    public override onEvent(interaction: Interaction): Awaitable<void> {
        if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) {
            return;
        }

        this.commandManagerService.run(interaction).catch(this.application.logger.error);
    }
}

export default InteractionCreateEventListener;
