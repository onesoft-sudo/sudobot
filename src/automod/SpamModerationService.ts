import { Message } from "discord.js";
import { AutoModServiceContract } from "../contracts/AutoModServiceContract";
import { Service } from "../framework/services/Service";

class SpamModerationService extends Service implements AutoModServiceContract {
    public async moderate(message: Message): Promise<void> {
        // Implementation here
    }
}

export default SpamModerationService;
