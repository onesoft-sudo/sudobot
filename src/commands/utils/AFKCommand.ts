import { Util, CommandInteraction, GuildMember, Interaction, Message, MessageAttachment } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';

export default class AFKCommand extends BaseCommand {
    supportsInteractions = true;

    constructor() {
        super('afk', 'utils', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        let status = options.isInteraction ? options.options.getString("reason") ?? undefined : options.args.join(" ");

        if (message instanceof Message) {
            status = status?.trim() === '' ? undefined : status;
        }

        await client.afkEngine.toggle(message, true, status);
    }
}