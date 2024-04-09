import { Message } from "discord.js";
import { MessageAutoModServiceContract } from "../contracts/MessageAutoModServiceContract";
import { Name } from "../framework/services/Name";
import { Service } from "../framework/services/Service";

@Name("ruleModerationService")
class RuleModerationService extends Service implements MessageAutoModServiceContract {
    public async moderate(_message: Message<boolean>): Promise<void> {
        
    }
}

export default RuleModerationService;
