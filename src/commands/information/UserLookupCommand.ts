import { formatDistanceStrict, formatDistanceToNowStrict } from "date-fns";
import { APIEmbedField } from "discord-api-types/v9";
import { Util, Message, CacheType, CommandInteraction } from "discord.js";
import Client from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import { emoji } from "../../utils/Emoji";
import getUser from "../../utils/getUser";
import BaseCommand from "../../utils/structures/BaseCommand";
import { getUserBadges } from "./ProfileCommand";

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


        if (user.hexAccentColor) {            
            embed.setColor(user.hexAccentColor);
        }

        const fieldsCommon: APIEmbedField[] = [  
            
        ];

        let fields: APIEmbedField[] = [
            {
                name: "Server Member?",
                value: member ? "Yes" : "No",
                inline: true
            },
            {
                name: "Bot?",
                value: user.bot ? "Yes" : "No",
                inline: true
            },
            {
                name: "Account created",
                value: user.createdAt.toLocaleString() + " (" + formatDistanceToNowStrict(user.createdAt, { addSuffix: true }) + ")",
                inline: true
            }
        ];

        embed.setThumbnail(user.displayAvatarURL());

        if (member) {
            fields.push({
                name: "Joined Server",
                value: member.joinedAt ? member.joinedAt.toLocaleString() + " (" + formatDistanceToNowStrict(member.joinedAt, { addSuffix: true }) + ")" : "Information not available",
                inline: true
            });

            if (member.premiumSince) {
                fields.push({
                    name: "Boosted Server",
                    value: member.premiumSince.toLocaleString() + " (" + formatDistanceToNowStrict(member.premiumSince, { addSuffix: true }) + ")",
                    inline: true
                });
            }

            if (member.communicationDisabledUntil) {
                fields.push({
                    name: "Timed-out Until",
                    value: member.communicationDisabledUntil.toLocaleString() + " (" + formatDistanceStrict(member.communicationDisabledUntil, new Date()) + ")",
                    inline: true
                });
            }

            if (member.displayAvatarURL()) {
                embed.setThumbnail(member.displayAvatarURL());
            }

            if (member.nickname) {
                fields.push({
                    name: "Nickname",
                    value: Util.escapeMarkdown(member.nickname)
                });
            }

            if (member.displayHexColor) {
                fields.push({
                    name: "Guild Profile Theme Color",
                    value: member.displayHexColor
                });
            }
            
            if (member.displayHexColor && !user.hexAccentColor) {
                embed.setColor(member.displayHexColor);
            }

            if (member.voice && member.voice.channel) {
                fields.push({
                    name: "Current Voice Channel",
                    value: member.voice.channel.toString()
                });
            }

            fields.push({
                name: "Completed Membership Screening",
                value: member.pending ? "No" : "Yes"
            });

            fields.push({
                name: "Mention",
                value: member.toString()
            });

            if (member.roles.highest.id !== member.guild.id) {
                fields.push({
                    name: "Highest Role",
                    value: member.roles.highest.toString()
                });
            }
        }

        const badges = getUserBadges(user).join('\n');

        fields.push({
            name: "Badges",
            value: badges.trim() === '' ? '*No badges found*' : badges
        });

        fields = [...fields, ...fieldsCommon];
        embed.setFields(fields);
        embed.setTimestamp();
        
        await message.reply({
            embeds: [
                embed
            ]
        });
    } 
}