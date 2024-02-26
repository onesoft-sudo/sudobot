import EventListener from "../core/EventListener";
import { Events } from "../types/ClientEvents";
import { VoiceState } from "discord.js";

export default class VoiceStateUpdateEventListener extends EventListener<Events.VoiceStateUpdate> {
    public readonly name = Events.VoiceStateUpdate;

    async execute(oldState: VoiceState, newState: VoiceState) {
        await this.client.loggerService.logVoiceStateUpdate(oldState, newState);
    }
}
