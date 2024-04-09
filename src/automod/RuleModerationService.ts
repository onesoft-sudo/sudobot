import { Awaitable, Message } from "discord.js";
import { MessageAutoModServiceContract } from "../contracts/MessageAutoModServiceContract";
import { Name } from "../framework/services/Name";
import { Service } from "../framework/services/Service";

@Name("ruleModerationService")
class RuleModerationService extends Service implements MessageAutoModServiceContract {
    public moderate(_message: Message<boolean>): Awaitable<void> {
        // throw new Error("Method not implemented.");
    }
}

export default RuleModerationService;
