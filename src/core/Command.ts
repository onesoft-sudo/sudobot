import { APIMessage, ChatInputCommandInteraction, InteractionReplyOptions, Message, MessageCreateOptions } from "discord.js";
import { ChatInputCommandContext, LegacyCommandContext } from "../services/CommandManager";
import Client from "./Client";

export default abstract class Command {
    public readonly name: string = '';
    public readonly group: string = '';
    public readonly aliases: string[] = [];

    public readonly supportsInteractions: boolean = true;
    public readonly supportsLegacy: boolean = true;

    constructor(protected client: Client) { }
    abstract execute(message: Message | ChatInputCommandInteraction, context: LegacyCommandContext | ChatInputCommandContext): Promise<((MessageCreateOptions | APIMessage | InteractionReplyOptions) & { __reply?: boolean }) | undefined | null>;

    run(message: Message | ChatInputCommandInteraction, context: LegacyCommandContext | ChatInputCommandContext) {
        return this.execute(message, context);
    }
}