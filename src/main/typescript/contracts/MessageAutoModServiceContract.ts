import type { Service } from "@framework/services/Service";
import type { Message } from "discord.js";

export interface MessageAutoModServiceContract extends Service {
    moderate(message: Message): Promise<boolean | void>;
}
