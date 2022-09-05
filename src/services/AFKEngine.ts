import { formatDistanceToNowStrict } from "date-fns";
import { CommandInteraction, GuildMember, Message, User, Util } from "discord.js";
import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";
import AFK, { IAFK } from "../models/AFK";
import Service from "../utils/structures/Service";

export interface MentionSchema {
    date: number;
    user: string; 
}

export default class AFKEngine extends Service {
    list: IAFK[] = [];

    constructor(client: DiscordClient) {
        super(client);
        AFK.find().then(models => this.list = models).catch(console.error);
    }

    findUsers(ids: string[], guild: string) {
        return this.list.filter(afk => ids.includes(afk.user) && afk.guild_id === guild);
    }
 
    async removeUser(id: string, guild: string) {
        let index = 0;

        for await (const afk of this.list) {
            if (afk.user === id && afk.guild_id === guild) {
                await afk.delete();
                this.list.splice(index, 1);
            }

            index++;
        }
    }
    
    async toggle(message: Message | CommandInteraction, enable: boolean = false, status?: string) {
        const afk = this.findUsers([message.member!.user.id], message.guild!.id);

        if (afk.length > 0) {
            const mentions = afk[0].get("mentions")! as Array<MentionSchema>;
            let count = 0, text = '';

            for await (const m of mentions) {
                if (count >= 3) {
                    break;
                }

                let member: GuildMember | undefined;

                try {
                    member = await message.guild!.members.fetch(m.user);

                    if (!member) {
                        throw new Error("user not found");
                    }
                }
                catch (e) {
                    console.log(e);
                    continue;                    
                }
                
                text += `\nFrom ${member.toString()}, ${formatDistanceToNowStrict(m.date, { addSuffix: true })}`;
                count++;
            }

            await this.client.afkEngine.removeUser(message.member!.user.id, message.guild!.id);

            await message.reply({
                embeds: [
                    new MessageEmbed({
                        description: `You're no longer AFK. You had ${mentions.length ?? 0} mentions in the server(s) where SudoBot is in.${mentions.length > 0 ? `\n\n**Mentions**:${text}` : ''}`,
                    })
                ]
            });
        }
        else if (enable) {
            this.client.afkEngine.list.push(await AFK.create({
                user: message.member!.user.id,
                guild_id: message.guild!.id,
                mentions: [],
                reason: status ?? undefined,
                createdAt: new Date()
            }));

            await message.reply({
                embeds: [
                    new MessageEmbed({
                        description: `You're AFK now${status ? `, for reason: **${Util.escapeMarkdown(status)}**` : ''}.`
                    })
                ]
            });
        }
    }

    async start(msg: Message) {
        if (msg.author.bot)
            return;

        const selfAFK = this.findUsers([msg.author.id], msg.guild!.id);

        if (selfAFK.length > 0) {
            this.toggle(msg, false);
        }
        
        const mention = msg.mentions.members?.first();

        if (mention) {
            const afkRecords: Array<IAFK> = this.findUsers([...msg.mentions.members!.keys()].slice(0, 3), msg.guild!.id).filter(afk => afk.user !== msg.author.id);

            if (!afkRecords || afkRecords.length < 1) {
                return;
            }

            for (const record of afkRecords) {
                const mentions = record.mentions as MentionSchema[];

                mentions.push({
                    date: Date.now(),
                    user: msg.author.id
                });

                record.set("mentions", mentions).save();
            }

            let text = `The following users are AFK right now:`;

            if (afkRecords.length > 1) {
                for await (const afkRecord of afkRecords) {
                    text += `\n**${msg.mentions.members!.get(afkRecord.get("user") as string)!.user.tag}**${afkRecord.get("reason") as (null | string) ? `\n**Reason**: ${Util.escapeMarkdown(afkRecord.get("reason") as string)}` : ""}`;
                }
            }
            else {
                text = `${msg.mentions.members!.get(afkRecords[0].get("user") as string)!.user.tag} is AFK right now${afkRecords[0].get("reason") as (null | string) ? `, for reason **${Util.escapeMarkdown(afkRecords[0].get("reason") as string)}**` : ""}.`;
            }

            await msg.reply({
                embeds: [
                    new MessageEmbed({
                        description: text
                    })
                ]
            });
        }
    }
};