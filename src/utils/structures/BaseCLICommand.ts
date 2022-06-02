import DiscordClient from "../../client/Client";

export default abstract class BaseCLICommand {
    requiredArgs = 0;
    requiredOptions = 0;

    constructor(protected name: string, protected category: string, protected aliases: string[] = []) {

    }

    getName(): string {
        return this.name;
    }

    getCategory(): string {
        return this.category;
    }

    getAliases(): string[] {
        return this.aliases;
    }

    public abstract run(client: DiscordClient, argv?: string[], args?: string[], options?: string[]): Promise<void>;
}