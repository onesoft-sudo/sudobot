import type Application from "@framework/app/Application";
import Kernel from "@framework/core/Kernel";
import { getEnvData } from "@main/env/env";
import { Client, GatewayIntentBits } from "discord.js";

class AppKernel extends Kernel {
    public override client = this.createClient();

    private createClient(): Client {
        return new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });
    }

    public async boot(application: Application): Promise<void> {}

    public async run(application: Application): Promise<void> {
        await this.client.login(getEnvData().BOT_TOKEN);
    }
}

export default AppKernel;
