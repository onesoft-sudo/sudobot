import { formatDistanceStrict, formatDistanceToNowStrict } from "date-fns";
import { APIEmbedField } from "discord-api-types/v9";
import { Util, Message, Interaction, CacheType, CommandInteraction } from "discord.js";
import Client from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import { emoji } from "../../utils/Emoji";
import getUser from "../../utils/getUser";
import { parseUser } from "../../utils/parseInput";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class UserLookupCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super("userlookup", "information", ['user', 'ulookup']);
    }

    async run(client: Client, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply({ ephemeral: true, content: `${emoji("error")} You must specify a user to lookup!` });
            return;
        }

        const user = !options.isInteraction ? await getUser(client, message as Message, options, 0) : options.options.getUser("user");

        if (!user) {
            await message.reply({ content: `${emoji("error")} That user does not exist.` });
            return;
        }

        let member = undefined;

        try {
            member = await message.guild!.members.fetch(user.id);

            if (!member)
                throw new Error("Member not found");
        }
        catch (e) {
            console.log(e);       
            member = undefined;     
        }
        
        const embed = new MessageEmbed({
            author: {
                name: user.tag,
                iconURL: user.displayAvatarURL()
            },
            footer: {
                text: `${user.id}`,
            }
        });

        const fieldsCommon: APIEmbedField[] = [  
            
        ];

        let fields: APIEmbedField[] = [
            {
                name: "Server Member?",
                value: member ? "Yes" : "No",
            },
            {
                name: "Account created",
                value: formatDistanceToNowStrict(user.createdAt, { addSuffix: true }),
                inline: true
            }
        ];

        if (member) {
            fields.push({
                name: "Joined Server",
                value: member.joinedAt ? formatDistanceToNowStrict(member.joinedAt, { addSuffix: true }) : "Information not available",
                inline: true
            });

            if (member.premiumSince) {
                fields.push({
                    name: "Boosted Server",
                    value: formatDistanceToNowStrict(member.premiumSince, { addSuffix: true }),
                    inline: true
                });
            }

            if (member.communicationDisabledUntil) {
                fields.push({
                    name: "Timed-out Until",
                    value: formatDistanceStrict(member.communicationDisabledUntil, new Date()),
                    inline: true
                });
            }

            if (member.displayAvatarURL() != user.displayAvatarURL()) {
                embed.setThumbnail(member.displayAvatarURL());
            }
        }

        fields = [...fields, ...fieldsCommon];
        embed.setFields(fields);
        
        await message.reply({
            embeds: [
                embed
            ]
        });
    } 
}