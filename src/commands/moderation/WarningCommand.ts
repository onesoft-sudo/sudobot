import { BanOptions, CommandInteraction, Guild, GuildMember, Interaction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import History from '../../automod/History';
import getMember from '../../utils/getMember';
import ms from 'ms';
import Punishment from '../../types/Punishment';
import { fetchEmoji } from '../../utils/Emoji';
import PunishmentType from '../../types/PunishmentType';

export default class WarningCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('warning', 'moderation', []);
    }

    async list(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires an argument.`)
                ]
            });

            return;
        }

        let user: User;

        try {
            user = await (options.isInteraction ? options.options.getUser('user') : (await getUser(client, msg as Message, options)))!;

            if (!user)
                throw new Error();
        }
        catch (e) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid user given.`)
                ]
            });

            return;
        }

        const warnings = await Punishment.findAll({
            where: {
                guild_id: msg.guild!.id,
                user_id: user.id,
                type: PunishmentType.WARNING
            },
        });

        if (warnings.length < 1) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`No warnings found for that user.`)
                ]
            });

            return;
        }

        let str = '';

        for await (const warning of warnings) {
            str += `ID: ${warning.get().id}\n`;
            str += `Reason: ${warning.get().reason ?? '*No reason provided*'}\n`;

            try {
                str += `Warned by: ${(await client.users.fetch(warning.get().mod_id)).tag}\n`;
            }
            catch (e) {
                str += `Warned by: ${warning.get().mod_id}\n`;
            }
            
            str += `Date: ${warning.get().createdAt}\n\n`;
        }

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: user.tag,
                    iconURL: user.displayAvatarURL()
                })
                .setDescription(`**All warnings**\n\n${str}`)
            ]
        });
    }

    async clear(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires an argument.`)
                ]
            });

            return;
        }

        let user: User;

        try {
            user = await (options.isInteraction ? options.options.getUser('user') : (await getUser(client, msg as Message, options)))!;

            if (!user)
                throw new Error();
        }
        catch (e) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid user given.`)
                ]
            });

            return;
        }

        const warning = await Punishment.destroy({
            where: {
                guild_id: msg.guild!.id,
                user_id: user.id,
                type: PunishmentType.WARNING
            },
        });

        if (warning < 1) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`No warnings found for that user.`)
                ]
            });

            return;
        }

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor('GREEN')
                .setDescription(`${(await fetchEmoji('check'))?.toString()} Cleared ${warning} warnings for ${user.tag}`)
            ]
        });
    }

    async remove(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires an argument.`)
                ]
            });

            return;
        }

        const id = options.isInteraction ? options.options.getNumber('id') : parseInt(options.args[0]);

        const warning = await Punishment.findOne({
            where: {
                id,
                guild_id: msg.guild!.id,
                type: PunishmentType.WARNING
            },
            order: [
                ['id', 'DESC']
            ],
        });

        if (!warning) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid warning ID given.`)
                ]
            });

            return;
        }

        await warning.destroy();

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor('GREEN')
                .setDescription(`${(await fetchEmoji('check'))?.toString()} Warning removed successfully!`)
            ]
        });
    }

    async view(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires an argument.`)
                ]
            });

            return;
        }

        const id = options.isInteraction ? options.options.getNumber('id') : parseInt(options.args[0]);

        const warning = await Punishment.findOne({
            where: {
                id,
                guild_id: msg.guild!.id,
                type: PunishmentType.WARNING
            },
            order: [
                ['id', 'DESC']
            ],
        });

        if (!warning) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid warning ID given.`)
                ]
            });

            return;
        }

        let mod: string = warning.get('mod_id') as string; 
        
        try {
            const m = await client.users.fetch(mod);
            mod = m.tag;
        }
        catch (e) {
            
        }

        let user: User | string = warning.get('user_id') as string; 
        
        try {
            user = await client.users.fetch(user);
        }
        catch (e) {
            
        }

        const fields = [
            {
                name: 'Warning ID',
                value: (warning.get('id') as number) + ''
            },
            {
                name: 'Reason',
                value: warning.get('reason') as string|null ?? '*No reason provided*'
            }, 
            {
                name: 'Warned by',
                value: mod
            },
        ];

        console.log(fields);
        

        await msg.reply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: typeof user === 'string' ? user : user.tag,
                        iconURL: typeof user === 'string' ? undefined : user.displayAvatarURL()
                    },
                    fields,
                })
                .setTimestamp(warning.get('createdAt') as Date)
            ]
        });
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires a subcommand.`)
                ]
            });

            return;
        }

        const subcmd = options.isInteraction ? options.options.getSubcommand(true) : options.args[0];

        if (!['view', 'remove', 'clear', 'list'].includes(subcmd)) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid subcommand given.`)
                ]
            });

            return;
        }

        if (!options.isInteraction)
            options.args.shift();
        
        await (this as any)[subcmd](client, msg, options);
    }
}