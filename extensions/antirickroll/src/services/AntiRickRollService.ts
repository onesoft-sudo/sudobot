import Service from "@sudobot/core/Service";
import { Message } from "discord.js";
import { rickrolls } from "../../resources/rickrolls.json";
export const name = "antiRickRollService";

export default class AntiRickRollService extends Service {
    protected readonly rickrolls = rickrolls;

    public async containsRickRoll(content: string): Promise<boolean> {
        for (const rickroll of this.rickrolls) {
            if (content.includes(rickroll)) {
                return true;
            }
        }

        return false;
    }

    public async scanMessage(message: Message): Promise<void> {
        if (!message.deletable) {
            return;
        }

        if (await this.containsRickRoll(message.content)) {
            await message.delete();
        }
    }
}
