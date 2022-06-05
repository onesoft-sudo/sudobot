import { BanOptions, CommandInteraction, EmojiIdentifierResolvable, GuildMember, Interaction, InteractionCollector, Message, MessageActionRow, MessageButton, MessageOptions, ReplyOptions, TextChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import getMember from '../../utils/getMember';
import History from '../../automod/History';
import { fetchEmoji } from '../../utils/Emoji';
import Punishment from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';

export default class HistoryCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('history', 'moderation', []);
    }

    async genEmbed(client: DiscordClient, msg: Message | Interaction, user: User, page: number = 1) {
        const limit = 3;
        const offset = ((page < 1 ? 1 : page) - 1) * limit;

        const logs = await Punishment.findAndCountAll({
            where: {
                guild_id: msg.guild!.id,
                user_id: user.id
            },
            order: [
                ['createdAt', 'DESC']
            ],
            limit,
            offset
        });

        let str = '';
        const maxPage = Math.ceil(logs.count / limit);

        const convert = (type: PunishmentType) => {            
            switch (type) {
                case PunishmentType.BAN:
                    return 'Ban';
                case PunishmentType.BEAN:
                    return 'Bean';
                case PunishmentType.MUTE:
                    return 'Mute';
                case PunishmentType.KICK:
                    return 'Kick';
                case PunishmentType.WARNING:
                    return 'Warning';
                case PunishmentType.UNBAN:
                    return 'Unban';
                case PunishmentType.UNMUTE:
                    return 'Unmute';
                default:
                    return "Unknown";
            }
        };

        for await (const log of logs.rows) {
            str += `**Case ID**: ${log.get().id}\n`;
            str += `Type: ${convert(log.get().type)}\n`;
            str += `Reason: ${log.get().reason ? (log.get().reason.trim() === '' ? '*No reason provided*' : log.get().reason) : '*No reason provided*'}\n`;

            // let mod_tag;

            // try {
            //     const mod = await client.users.fetch(log.get().mod_id);

            //     if (!mod)
            //         throw new Error();

            //     mod_tag = mod.tag;
            // }
            // catch (e) {
            //     mod_tag = log.get().mod_id;
            // }

            str += `Action Executor: ${log.get().mod_tag}\n`;
            str += `Date: ${log.get().createdAt.toLocaleString('en-US')}\n`;

            // if (log.get().type === PunishmentType.MUTE) {
            //     str += `Duration: ${(log.get().meta ? JSON.parse(log.get().meta) : {})?.time ?? '*No duration set*'}\n`;               
            // }

            if (log.get().meta) {
                const json = JSON.parse(log.get().meta);

                if (Object.keys(json).length > 0) {
                    str += "Additional Attributes:\n```\n";

                    for (const key in json) {
                        str += `${key}: ${json[key]}\n`;
                    }

                    str += '\n```\n';
                }
            }

            str += '\n';
        }

        return {
            embeds: [
                new MessageEmbed({
                    author: {
                        name: user.tag,
                        iconURL: user.displayAvatarURL()
                    },
                    title: 'Moderation History',
                    description: str === '' ? 'No history.' : str,
                    timestamp: new Date(),
                })
            ],
            components: [
                this.createActionRow(page, maxPage)
            ]
        };
    }

    createActionRow(page: number, max: number) {
        console.log(max);
        
        const back = new MessageButton({
            customId: 'history-back-',
            label: '<<',
            style: 'PRIMARY'
        });

        const next = new MessageButton({
            customId: 'history-next-',
            label: '>>',
            style: 'PRIMARY'
        });

        let nextPage = page + 1;
        console.log(nextPage);

        if (nextPage > max) {
            nextPage = max;
            next.setDisabled(true);
        }
        else {
            next.setDisabled(false);
        }

        let prevPage = page - 1;
        console.log(prevPage);

        if (prevPage <= 0) {
            prevPage = 1;
            back.setDisabled(true);
        }
        else {
            back.setDisabled(false);
        }

        next.setCustomId('history-next-' + nextPage);
        back.setCustomId('history-back-' + prevPage);

        return new MessageActionRow()
            .addComponents(
                back,
                next
            );
    }

    async update(client: DiscordClient, interaction: Interaction, message: Message) {
        console.log('here');
        
        if (interaction.isButton() && interaction.customId.startsWith('history-')) {
            const splitted = interaction.customId.split('-');

            if (splitted[2] === undefined || parseInt(splitted[2]) === NaN) 
                return;

            if (splitted[1] === 'next' || splitted[1] === 'back') {
                const options = await this.genEmbed(client, interaction, (global as any).user, parseInt(splitted[2]));
                try {
                    await interaction.update(options);
                }
                catch (e) {
                    console.log(e);                    
                }
            }
        }
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        let user: User | null | undefined;

        if (options.isInteraction) {
            user = await <User> options.options.getUser('user');
        }
        else {
            try {
                user = await getUser(client, msg as Message, options);

                if (!user) 
                    throw new Error();
            }
            catch (e) {
                console.log(e);
                
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid user given.`)
                    ]
                });

                return;
            }
        }

        (global as any).user = user;

        let message = <Message> await msg.reply(await this.genEmbed(client, msg, user));

        if (msg instanceof CommandInteraction)
            message = <Message> await msg.fetchReply();

        const collector = new InteractionCollector(client, {
            guild: msg.guild!,
            channel: msg.channel!,
            max: 20,
            componentType: 'BUTTON',
            interactionType: 'MESSAGE_COMPONENT',
            message,
            time: 30000,
            filter(i) {
                return i.isButton() && i.member?.user.id === msg.member!.user.id;
            }
        });

        collector.on('collect', async i => {
            await this.update(client, i, message);
        });

        collector.on('end', async () => {
            try {
                await message.edit({
                    components: []
                });
            }
            catch (e) {
                console.log(e);                
            }
        });
    }
}