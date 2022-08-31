import { formatDistanceToNowStrict } from "date-fns";
import { Message, Interaction, CacheType, CommandInteraction, Guild, GuildPreview } from "discord.js";
import Client from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import { emoji } from "../../utils/Emoji";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class GuildLookupCommand extends BaseCommand {
    constructor() {
        super("guildlookup", "information", ["glookup", "guild"]);
    }

    async run(client: Client, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply(`${emoji('error')} You must provide the guild/server ID to lookup.`);
            return;
        }

        const inputID = options.isInteraction ? options.options.getString("guild_id")! : options.args[0];
        let guild: GuildPreview | undefined;

        try {
            guild = await client.fetchGuildPreview(inputID);

            if (!guild) {
                guild = undefined;
            }
        }
        catch (e) {
            console.log(e);            
        }

        if (!guild) {
            await message.reply(`${emoji('error')} No guild/server was found with that ID or the guild isn't a public server.`);
            return;
        }

        await message.reply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: guild.name,
                        iconURL: guild.iconURL() ?? undefined
                    },
                    description: guild.description ?? '*No description available*',
                    fields: [
                        {
                            name: "Approximate Member Count",
                            value: guild.approximateMemberCount + '',
                            inline: true
                        },
                        {
                            name: "Approximate Presence Count",
                            value: guild.approximatePresenceCount + '',
                            inline: true
                        },
                        {
                            name: "Created",
                            value: `${guild.createdAt.toLocaleString()} (${formatDistanceToNowStrict(guild.createdAt, { addSuffix: true })})`,
                        },
                    ],
                    thumbnail: guild.splashURL() ? {
                        url: guild.splashURL()!
                    } : undefined,
                    footer: {
                        text: `${guild.id}`
                    }
                })
                .setTimestamp()
            ]
        });
    }
}