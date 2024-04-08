import { Message } from "discord.js";
import { Service } from "../framework/services/Service";

export interface MessageAutoModServiceContract extends Service {
    moderate(message: Message): Promise<boolean | void>;
}
