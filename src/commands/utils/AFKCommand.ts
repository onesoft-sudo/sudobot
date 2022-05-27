import { CommandInteraction, GuildMember, Interaction, Message, MessageAttachment } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { download } from '../../utils/util';
import path from 'path';
import { fetchEmoji } from '../../utils/Emoji';

export async function notAFK(client: DiscordClient, msg: Message | CommandInteraction, data: any) {
    client.db.get('DELETE FROM afk WHERE user_id = ?', [msg.member!.user.id], async (err: any) => {
        await msg.channel!.send({
            embeds: [
                new MessageEmbed()
                .setDescription('You\'re no longer AFK. You had **' + data.mentions + '** mentions in the servers where SudoBot is joined.')
            ]
        });
    });
}

export async function AFK(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
    let reason: string | undefined = undefined;

    if (!options.isInteraction) {
        reason = options.args[0] === undefined ? undefined : options.args.join(' ');
    }
    else if (options.options.getString('reason')) {
        reason = <string> await options.options.getString('reason');
    }

    client.db.get('INSERT INTO afk(user_id, date, mentions, reason) VALUES(?, ?, ?, ?)', [msg.member!.user.id, new Date().toISOString(), '0', reason === undefined ? '' : reason], async (err: any) => {
        await msg.channel!.send({
            embeds: [
                new MessageEmbed()
                .setDescription('You\'re AFK now.' + (reason === undefined ? '' : ` Your status has been updated to: **${reason.replace(/\*/g, '\\*')}**`))
            ]
        });
    });
}

export default class AFKCommand extends BaseCommand {
    supportsInteractions = true;

    constructor() {
        super('afk', 'utils', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        client.db.get("SELECT * FROM afk WHERE user_id = ?", [msg.member!.user.id], async (err: any, data: any) => {
            if (data) {
                notAFK(client, msg, data);
            }
            else {
                AFK(client, msg, options);
            }
        });
    }
}