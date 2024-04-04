import { Message } from "discord.js";
import { Service } from "../framework/services/Service";

export interface AutoModServiceContract extends Service {
    moderate(message: Message): Promise<void>;
}
