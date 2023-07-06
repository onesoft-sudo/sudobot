import { ClientEvents, Interaction } from "discord.js";
import Event from "../../core/Event";

export default class InteractionCreateEvent extends Event {
    public name: keyof ClientEvents = 'interactionCreate';

    async execute(interaction: Interaction) {
        if (interaction.isChatInputCommand()) {
            this.client.commandManager.runCommandFromChatInputCommandInteraction(interaction).catch(console.error);
            return;
        }
    }
}