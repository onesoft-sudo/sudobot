/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License 
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

import { channelMention } from "@discordjs/builders";
import { Message, TextChannel, Guild, GuildMember, Util } from "discord.js";
import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import BlockedWordViolation from "../models/BlockedWordViolation";
import { BlockedWordType } from "../types/BlockedWordType";
import { hasConfig } from "../utils/util";

export type MessageFilterConfig = {
    words_enabled: boolean;
    regex: boolean;
    words_excluded: string[];
    words: string[];
    invite_enabled: boolean;
    invite_excluded: string[];
    ignore_staff: boolean;
    invite_message: string;
    words_repeated: number;
    chars_repeated: number;
    pings: number;
    tokens: string[];
    regex_patterns: string[];
    rickrolls_enabled: boolean;
    off: boolean;
    invite_whitelist?: string[];
    ignore_admins?: boolean;
    staff_reminder?: boolean;
};

export default class MessageFilter {
	rickrolls: string[] = [];
	
    constructor(protected client: DiscordClient, protected config: MessageFilterConfig = {} as MessageFilterConfig) {
        
    }

    async load() {
        this.config = await this.client.config.get('filters');

        if (this.rickrolls.length < 1 && this.config.rickrolls_enabled) {
        	const data = await readFile(resolve(process.env.SUDO_PREFIX ?? join(__dirname, '..', '..'), 'resources', 'rickrolls.json'));
        	this.rickrolls = await (JSON.parse(data.toString()).rickrolls || []);
        }
    }

	async filterRickRolls({ content }: Message) {
		if (!this.config.rickrolls_enabled) {
			return false;
		}

		for await (const url of this.rickrolls) {
			if (content.includes(url)) {
				return true;
			}
		}
	}
    
    async filterAlmostSameChars(str: string) {
        return (new RegExp('(.+)\\1{' + this.config.chars_repeated + ',}', 'gm')).test(str.trim());
    } 

    async filterPings(str: string) {   
        if (!this.config.pings) {
            return false;
        }   

        let data = [...str.matchAll(new RegExp(`\<\@[0-9]+\>`, 'gm'))];

		console.log('users', data);

        if (data.length >= this.config.pings)
            return true;
        
        data = [...str.matchAll(new RegExp(`\<\@\&[0-9]+\>`, 'gm'))];
		console.log('roles', data);
		
        return data.length >= this.config.pings;
    } 

    async filterAlmostSameText(str: string) {
        return (new RegExp('^(.+)(?: +\\1){' + this.config.words_repeated + '}', 'gm')).test(str.trim());
    } 

    async filterRepeatedText(msg: Message) {
		const excluded = this.client.config.props[msg.guild!.id].spam_filter.exclude;

		if (excluded.indexOf(msg.channel!.id) !== -1 || excluded.indexOf((msg.channel! as TextChannel).parent?.id) !== -1)
			return;
        
        const chars = await this.filterAlmostSameChars(msg.content);
        const words = await this.filterAlmostSameText(msg.content);

        console.log("FILTER", chars, words);
    
        return await this.filterAlmostSameChars(msg.content) || await this.filterAlmostSameText(msg.content);
    }

    async filterBlockedWords(msg: Message) {
        if (!this.config.words_enabled) 
            return true;
        
        if (this.config.words_excluded.indexOf(msg.channel.id) !== -1 || this.config.words_excluded.indexOf((msg.channel as TextChannel).parent?.id!) !== -1) 
            return true;

        let wordsList: string[] = [];

        if (!this.config.regex)
            wordsList = this.client.commonService.words;

        for (let word of this.config.words) {
            if (this.config.regex) {
                const matches = msg.content.match(new RegExp(word, 'gmi'));
            
                if (matches && matches?.length > 0) {
                    return {
                        word: matches[0],
                        all: matches
                    }
                };
            }
            else if (wordsList.filter(w => w === word.trim()).length > 0) {
                return {
                    word: word,
                    all: [word]
                }
            }
        }

        return true;
    }

    async filterBlockedTokens(msg: Message) {
        if (!this.config.words_enabled) 
            return true;
        
        if (this.config.words_excluded.indexOf(msg.channel.id) !== -1 || this.config.words_excluded.indexOf((msg.channel as TextChannel).parent?.id!) !== -1) 
            return true;

        console.log(this.config);
        console.log(this.config.tokens);

        for (let token of this.config.tokens) {
            if (msg.content.toLowerCase().includes(token.toLowerCase())) {
                return token;
            }
        }

        return true;
    }

    async filterBlockedRegExp(msg: Message) {
        if (!this.config.words_enabled) 
            return true;
        
        if (this.config.words_excluded.indexOf(msg.channel.id) !== -1 || this.config.words_excluded.indexOf((msg.channel as TextChannel).parent?.id!) !== -1) 
            return true;

        for (let regex of this.config.regex_patterns) {
            if ((new RegExp(regex, 'gim')).test(msg.content)) {
                return regex;
            }
        }

        return true;
    }

    async filterInvites(msg: Message) {
        if (!this.config.invite_enabled) 
            return true;

        if (this.config.invite_excluded.indexOf(msg.channel.id) !== -1 || this.config.invite_excluded.indexOf((msg.channel as TextChannel).parent?.id!) !== -1) 
            return true;

        const matches = await msg.content.match(/(http(s)?\:\/\/)?(discord\.gg|discord\.com\/invite)\/([A-Za-z0-9-_]+)/gmi);

        console.log(matches);

        if (matches && matches.length > 0) {
           try {
                const invites = await msg.guild!.invites.fetch();
                const excluded = this.config.invite_whitelist ?? [];
                const vanityURL = msg.guild!.vanityURLCode;

                if (vanityURL) {
                    excluded.push(vanityURL);
                }

                if (!invites.size) {
                    return matches;
                }

                for (let match of matches) {
                    let code: string[] | string = await match.split('/');
                    code = await code[code.length - 1];

                    if (excluded.includes(code.trim())) {
                        continue;
                    }

                    let filtered = invites.has(code.trim());
                        
                    if (!filtered) {
                        return matches;
                    }
                }
           }
           catch(e) {
                console.log(e);
           }
        }
    }

    async filterFiles(msg: Message) {
        for await (const a of Array.from(msg.attachments.values())) {
            console.log(a);

            for await (const t of this.client.config.get('filters').file_types_excluded) {
                console.log(t, a.name!.toLowerCase());

                if (a.name!.toLowerCase().endsWith('.' + t)) {
                    return t;
                }
            }

            for await (const t of this.client.config.get('filters').file_mimes_excluded) {
                if (a.contentType == t) {
                    return t;
                }
            }
        }

        return true;
    }

    async filterDomains({ content, channel: { id } }: Message) {
        if (this.client.config.get('filters').domain_enabled && !this.client.config.get('filters').domain_excluded.includes(id)) {
            for await (const domain of this.client.config.get('filters').domains) {
                const pattern = `((http|https|ftp|blob)\:(\/)?(\/)?)?${domain.replace('.', '\\.').replace(/\*/g, '[a-zA-Z0-9-_\\.]+')}`;               
                const regex = new RegExp(pattern, 'gm');

                if (regex.test(content)) {
                    return true;
                }
            }
        }

        return false;
    }

    async fetchLoggingChannel(guild: Guild) {
        return <TextChannel> await guild.channels.fetch(this.client.config.get('logging_channel'));
    }

    async remindStaffIfNeeded(member: GuildMember) {
        if (!member!.roles.cache.has(this.client.config.get('mod_role')) || !this.config.staff_reminder) {
            return;
        }

        member.send({
            embeds: [
                new MessageEmbed({
                    author: {
                        iconURL: member.guild.iconURL() ?? undefined,
                        name: `You've gotten a reminder notification in ${Util.escapeMarkdown(member.guild.name)}`
                    },
                    description: `You posted a blocked word or token.\nRemember you're a moderator, and we expect the moderators to discourage everyone about the usage of blocked words and not to use it themselves too. So, don't use blocked words please.\nHopefully you keep that in mind next time.`,
                    footer: {
                        text: "Reminded"
                    }
                })
                .setTimestamp()
            ]
        }).catch(console.error);
    }

    async start(msg: Message) {
        if (!hasConfig(this.client, msg.guildId!, "filters"))
            return;
        
        await this.load();

        if (this.config.off) {
            return;
        }

        if (this.config.ignore_staff && msg.member!.roles.cache.has(this.client.config.get('mod_role')))
            return;

        if (this.config.ignore_admins && msg.member!.roles.cache.has(this.client.config.get('admin')))
            return;

        const token = await this.filterBlockedTokens(msg);

        if (token !== true) {
            try {
                await msg.delete();
            }
            catch (e) {
                console.log(e);                
            }

            const channel = await this.fetchLoggingChannel(msg.guild!);

            await channel.send({
                embeds: [
                    new MessageEmbed({
                        author: {
                            name: msg.author.tag,
                            iconURL: msg.member!.displayAvatarURL(),
                        },
                        title: 'Posted blocked token(s)',
                        fields: [
                            {
                                name: "Token",
                                value: `||${token}||`
                            },
                            {
                                name: "Channel",
                                value: `${channelMention(msg.channel.id)} (${msg.channel.id})`
                            },
                        ],
                        timestamp: new Date(),
                        footer: {
                            text: 'Deleted'
                        }
                    })
                    .setColor('#f14a60')
                ]
            });

            this.remindStaffIfNeeded(msg.member!);

            BlockedWordViolation.findOneAndUpdate({
                guild_id: msg.guildId!,
                user_id: msg.author.id,
                word_token: token,
                ruleIndex: this.config.tokens.indexOf(token),
                type: BlockedWordType.TOKEN,
            }, {
                updatedAt: new Date(),
                $inc: {
                    count: 1
                }
            }, {
                upsert: true
            }).catch(console.error);

            return;
        }
        
        const regex = await this.filterBlockedRegExp(msg);

        if (regex !== true) {
            try {
                await msg.delete(); 
            }
            catch (e) {
                console.log(e);                
            }

            const channel = await this.fetchLoggingChannel(msg.guild!);

            await channel.send({
                embeds: [
                    new MessageEmbed({
                        author: {
                            name: msg.author.tag,
                            iconURL: msg.member!.displayAvatarURL(),
                        },
                        title: 'Posted messages that matched to a blocked Regex',
                        fields: [
                            {
                                name: "Regex Pattern",
                                value: `||${regex}||`
                            },
                            {
                                name: "Channel",
                                value: `${channelMention(msg.channel.id)} (${msg.channel.id})`
                            },
                        ],
                        timestamp: new Date(),
                        footer: {
                            text: 'Deleted'
                        }
                    })
                    .setColor('#f14a60')
                ]
            });

            this.remindStaffIfNeeded(msg.member!);

            return;
        }
        
        const blockedPass = await this.filterBlockedWords(msg);
        const files = await this.filterFiles(msg);

        const matches = await this.filterInvites(msg);

        if (matches instanceof Array) {
            await msg.delete();

            const content = this.config.invite_message.replace(':mention:', `<@${msg.author.id}>`);

            const message = await msg.channel.send({
                content
            });

            setTimeout(async () => {
                try {
                    await message.delete();
                }
                catch (e) {
                    console.log(e);                        
                }
            }, 10000);

            try {
                const channel = <TextChannel> await msg.guild!.channels.fetch(this.client.config.get('logging_channel'));

                await channel!.send({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setAuthor({
                            name: msg.author.tag,
                            iconURL: msg.author.displayAvatarURL()
                        })
                        .setTitle(`Posted invite(s)`)
                        .addFields([
                            {
                                name: "URL",
                                value: '`' + matches.join('` `') + '`'
                            },
                            {
                                name: "Channel",
                                value: `${channelMention(msg.channel.id)} (${msg.channel.id})`
                            },
                        ])
                        .setFooter({
                            text: "Deleted"
                        })
                        .setTimestamp()
                    ]
                });
            }
            catch(e) {
                console.log(e);
            }

            return;
        }

        if (blockedPass !== true) {
            try {
                await msg.delete();
                const channel = <TextChannel> await msg.guild!.channels.fetch(this.client.config.get('logging_channel'));

                await channel!.send({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setAuthor({
                            name: msg.author.tag,
                            iconURL: msg.author.displayAvatarURL()
                        })
                        .setTitle(`Blocked words detected`)
                        .addFields([
                            {
                                name: "Word",
                                value: "||" + blockedPass.word + "||"
                            },
                            {
                                name: "Channel",
                                value: `${channelMention(msg.channel.id)} (${msg.channel.id})`
                            },
                        ])
                        .setFooter({
                            text: "Deleted"
                        })
                        .setTimestamp()
                    ]
                });

                this.remindStaffIfNeeded(msg.member!);

                BlockedWordViolation.findOneAndUpdate({
                    guild_id: msg.guildId!,
                    user_id: msg.author.id,
                    word_token: blockedPass.word,
                    ruleIndex: this.config.words.indexOf(blockedPass.word),
                    type: BlockedWordType.WORD,
                }, {
                    updatedAt: new Date(),
                    $inc: {
                        count: 1
                    }
                }, {
                    upsert: true
                }).catch(console.error);
            }
            catch(e) {
                console.log(e);
            }
        }
        else if (msg.attachments.size > 0 && files !== true) {
            try {
                await msg.delete();
                const channel = <TextChannel> await msg.guild!.channels.fetch(this.client.config.get('logging_channel'));

                await channel!.send({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setAuthor({
                            name: msg.author.tag,
                            iconURL: msg.author.displayAvatarURL()
                        })
                        .setTitle(`Blocked files types detected`)
                        .addFields([
                            {
                                name: "File Type/Extension",
                                value: files + ""
                            },
                            {
                                name: "Channel",
                                value: `${channelMention(msg.channel.id)} (${msg.channel.id})`
                            },
                        ])
                        .setFooter({
                            text: "Deleted"
                        })
                        .setTimestamp()
                    ]
                });
            }
            catch(e) {
                console.log(e);
            }

            console.log(files);
        }
        else if ((await this.filterRepeatedText(msg))) {
            await msg.delete();

            const channel = <TextChannel> await msg.guild!.channels.fetch(this.client.config.get('logging_channel'));

            await channel!.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setAuthor({
                        name: msg.author.tag,
                        iconURL: msg.author.displayAvatarURL()
                    })
                    .setTitle(`Repeated text detected`)
                    .setDescription(msg.content)
                    .addFields([
                        {
                            name: "Channel",
                            value: `${channelMention(msg.channel.id)} (${msg.channel.id})`
                        },
                    ])
                    .setFooter({
                        text: "Deleted"
                    })
                    .setTimestamp()
                ]
            });
        }
        else if ((await this.filterPings(msg.content))) {
            await msg.delete();

            const channel = <TextChannel> await msg.guild!.channels.fetch(this.client.config.get('logging_channel'));

            await channel!.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setAuthor({
                        name: msg.author.tag,
                        iconURL: msg.author.displayAvatarURL()
                    })
                    .setTitle(`Mass mention detected`)
                    .addFields([
                        {
                            name: "Channel",
                            value: `${channelMention(msg.channel.id)} (${msg.channel.id})`
                        },
                    ])
                    .setDescription(msg.content)
                    .setFooter({
                        text: "Deleted"
                    })
                    .setTimestamp()
                ]
            });
        }
        else if ((await this.filterDomains(msg))) {
            await msg.delete();

            const channel = <TextChannel> await msg.guild!.channels.fetch(this.client.config.get('logging_channel'));

            await channel!.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setAuthor({
                        name: msg.author.tag,
                        iconURL: msg.author.displayAvatarURL()
                    })
                    .setTitle(`Restricted domains detected`)
                    .setDescription(msg.content)
                    .addFields([
                        {
                            name: "Channel",
                            value: `${channelMention(msg.channel.id)} (${msg.channel.id})`
                        },
                    ])
                    .setFooter({
                        text: "Deleted"
                    })
                    .setTimestamp()
                ]
            });
        }
        else if ((await this.filterRickRolls(msg))) {
            await msg.delete();

            const channel = <TextChannel> await msg.guild!.channels.fetch(this.client.config.get('logging_channel'));

            await channel!.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setAuthor({
                        name: msg.author.tag,
                        iconURL: msg.author.displayAvatarURL()
                    })
                    .setTitle(`Rickroll URLs detected`)
                    .setDescription(msg.content)
                    .addFields([
                        {
                            name: "Channel",
                            value: `${channelMention(msg.channel.id)} (${msg.channel.id})`
                        },
                    ])
                    .setFooter({
                        text: "Deleted"
                    })
                    .setTimestamp()
                ]
            });
        }
    }
};
