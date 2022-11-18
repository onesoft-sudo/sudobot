import { formatDistanceToNowStrict } from "date-fns";
import { Message, CacheType, CommandInteraction, User, Util } from "discord.js";
import { isValidObjectId } from "mongoose";
import Client from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import Punishment from "../../models/Punishment";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import PunishmentType from "../../types/PunishmentType";
import BaseCommand from "../../utils/structures/BaseCommand";
import { convert } from "./HistoryCommand";

export default class InfractionCommand extends BaseCommand {
    name = "infraction";
    category = "moderation";
    aliases = ['i', 'infr', 'punishment', 'punishments'];
    supportsInteractions = true;

    async run(client: Client, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply(":x: You must provide an ID of an infraction to view it!");
            return;
        }

        const id = options.isInteraction ? options.options.getString('id') : options.args[0];

        if (!isValidObjectId(id)) {
            await message.reply(":x: That's not a valid ID! It must comply with mongo object IDs!");
            return;
        }

        const punishment = await Punishment.findOne({
            _id: id,
            guild_id: message.guild!.id,
        });

        if (!punishment) {
            await message.reply(":x: No infraction found! Make sure the ID is correct and/or the infraction was not deleted manually!");
            return;
        }

        let user: User | undefined;

        try {
            user = await client.users.fetch(punishment.user_id);
        }
        catch (e) {
            console.log(e);
        }

        let str = '';

        if (punishment.meta) {
            const json = typeof punishment.meta === 'string' ? JSON.parse(punishment.meta) : punishment.meta;

            if (Object.keys(json).length > 0) {
                str += "Additional Attributes:\n```\n";

                for (const key in json) {
                    str += `${key}: ${json[key]}\n`;
                }

                str += '\n```\n';
            }
        }

        await message.reply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: user?.tag ?? `Unknown (ID: ${punishment.user_id})`,
                        iconURL: user?.displayAvatarURL()
                    },
                    title: 'Viewing Infraction: ' + id,
                    fields: [
                        {
                            name: 'Type',
                            value: convert(punishment.type as PunishmentType),
                            inline: true
                        },
                        {
                            name: 'Moderator',
                            value: `<@${punishment.mod_id}> (${Util.escapeMarkdown(punishment.mod_tag)})`,
                            inline: true
                        },
                        {
                            name: 'Meta Info',
                            value: str === '' ? '*No info*' : str,
                        },
                        {
                            name: 'Reason',
                            value: punishment.reason ?? '*No reason provided*',
                        },
                        {
                            name: 'Date',
                            value: `${punishment.createdAt.toUTCString()} (${formatDistanceToNowStrict(punishment.createdAt, { addSuffix: true })})`,
                        },
                    ],
                })
                .setTimestamp()
            ]
        });
    }
}