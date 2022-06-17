import { channelMention } from "@discordjs/builders";
import { Message, TextChannel, MessageMentions, Guild } from "discord.js";
import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";

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
};

export default class MessageFilter {
    constructor(protected client: DiscordClient, protected config: MessageFilterConfig = {} as MessageFilterConfig) {
        
    }

    load() {
        this.config = this.client.config.get('filters');
    }
    
    async filterAlmostSameChars(str: string) {
        return (new RegExp('(.+)\\1{' + this.config.chars_repeated + ',}', 'gm')).test(str.trim());
    } 

    async filterPings(str: string) {        
        let data = [...str.matchAll(new RegExp(`[(${MessageMentions.USERS_PATTERN})]+`, 'gm'))];

        if (data.length >= this.config.pings)
            return false;
        
        data = [...str.matchAll(new RegExp(`[(${MessageMentions.ROLES_PATTERN})]+`, 'gm'))];

        return data.length >= this.config.pings;
    } 

    async filterAlmostSameText(str: string) {
        return (new RegExp('^(.+)(?: +\\1){' + this.config.words_repeated + '}', 'gm')).test(str.trim());
    } 

    async filterRepeatedText(msg: Message) {
        return await this.filterAlmostSameChars(msg.content) || await this.filterAlmostSameText(msg.content);
    }

    async filterBlockedWords(msg: Message) {
        if (!this.config.words_enabled) 
            return true;
        
        if (this.config.words_excluded.indexOf(msg.channel.id) !== -1 || this.config.words_excluded.indexOf((msg.channel as TextChannel).parent?.id!) !== -1) 
            return true;

        let wordsList: string[] = [];

        if (!this.config.regex)
            wordsList = msg.content.toLowerCase().split(/\s+/);

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

        for (let token of this.config.tokens) {
            if (msg.content.includes(token)) {
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

                if (!invites.size) {
                    return matches;
                }

                for (let match of matches) {
                    let code: string[]|string = await match.split('/');
                    code = await code[code.length - 1];

                    let filtered = await invites.has(code.trim());

                    console.log(3);
                        
                    if (!filtered) {
                        return matches;
                    }
                }
           }
           catch(e) {
                console.log(e, 'here');
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
                const pattern = `((http|https|ftp|blob)\:(\/)?(\/)?)?${domain.replace('.', '\\.').replace('*', '[a-zA-Z0-9-_\\.]+')}`;               
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

    async start(msg: Message) {
        this.load();

        if (this.config.ignore_staff && msg.member!.roles.cache.has(this.client.config.get('mod_role')))
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
    }
};