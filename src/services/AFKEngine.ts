import { CommandInteraction, GuildMember, Message, User } from "discord.js";
import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";
import { notAFK } from "../commands/utils/AFKCommand";
import Service from "../utils/structures/Service";

export default class AFKEngine extends Service {
    mention(msg: Message, user: GuildMember, cb: (data: any) => void, msg1?: any) {
        this.client.db.get('SELECT * FROM afk WHERE user_id = ?', [user.id], (err: any, data: any) => {
            if (data) {
                if (msg1 === undefined) {
                    msg.channel!.send({
                        embeds: [
                            new MessageEmbed()
                            .setDescription(`**${user.user.tag}** is AFK right now${data.reason.trim() == '' ? '.' : (' for reason: **' + data.reason.replace(/\*/g, '\\*') + '**')}`)
                        ]
                    });
                }

                this.client.db.get('UPDATE afk SET mentions = ? WHERE id = ?', [parseInt(data.mentions) + 1, data.id], (err: any) => {});

                cb(data);
            }
        });

    }

    start(msg: Message) {
        if (msg.author.bot)
            return;
        
        const mention = msg.mentions.members!.first();

        if (mention) {
            this.mention(msg, msg.member!, data => {
                if (msg.author.id === data.user_id) {
                    notAFK(this.client, msg, data);
                }
            }, true);
            
            msg.mentions.members!.forEach((member) => {
                this.mention(msg, member, data => {
                    if (msg.author.id === data.user_id) {
                        notAFK(this.client, msg, data);
                    }
                });
            });
        }
        else {
            this.client.db.get('SELECT * FROM afk WHERE user_id = ?', [msg.author.id], (err: any, data: any) => {
                if (data) {
                    notAFK(this.client, msg, data);
                }
            });
        }
    }
};