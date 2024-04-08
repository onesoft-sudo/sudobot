import { Message } from "discord.js";
import { MessageAutoModServiceContract } from "../contracts/MessageAutoModServiceContract";
import { Service } from "../framework/services/Service";

class RuleModerationService extends Service implements MessageAutoModServiceContract {
    public moderate(message: Message<boolean>): Promise<void> {
        throw new Error("Method not implemented.");
    }
}

export default RuleModerationService;
