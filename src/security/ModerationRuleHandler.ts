import { Invite, Snowflake, spoiler } from "discord.js";
import ModerationRuleHandlerContract, {
    MessageRuleContext,
    RuleExecResult
} from "../contracts/ModerationRuleHandlerContract";
import * as cache from "../framework/cache/GlobalStore";
import { GatewayEventListener } from "../framework/events/GatewayEventListener";
import { HasApplication } from "../framework/types/HasApplication";
import { HasEventListeners } from "../framework/types/HasEventListeners";
import { normalize } from "../framework/utils/string";

// FIXME: This class is not complete and is only a placeholder for the actual implementation.

type MessageContext<T> = MessageRuleContext<"message", { type: T }>;

class ModerationRuleHandler
    extends HasApplication
    implements ModerationRuleHandlerContract, HasEventListeners
{
    protected readonly inviteCache = new Map<`${Snowflake}_${string}`, Invite>();
    protected readonly computedRegexCache = new WeakMap<
        Array<string | [string, string]>,
        RegExp[]
    >();

    private preconditionForInviteCaches(guild: Snowflake) {
        const config =
            this.application.getServiceByName("configManager").config[guild]?.rule_moderation;

        return config?.enabled && config.rules.some(r => r.type === "anti_invite");
    }

    @GatewayEventListener("inviteCreate")
    public async onInviteCreate(invite: Invite) {
        if (!invite.guild || !this.preconditionForInviteCaches(invite.guild.id)) {
            return;
        }

        this.inviteCache.set(`${invite.guild?.id}_${invite.code}`, invite);
    }

    @GatewayEventListener("inviteDelete")
    public async onInviteDelete(invite: Invite) {
        if (!invite.guild || !this.preconditionForInviteCaches(invite.guild.id)) {
            return;
        }

        this.inviteCache.delete(`${invite.guild?.id}_${invite.code}`);
    }

    public async boot() {
        const handler = () => {
            this.inviteCache.clear();
            this.application.client.guilds.cache.forEach(async guild => {
                if (!this.preconditionForInviteCaches(guild.id)) {
                    return;
                }

                const invites = await guild.invites.fetch();

                invites.forEach(invite => {
                    this.inviteCache.set(`${guild.id}_${invite.code}`, invite);
                });
            });

            this.application.logger.info("Invite cache has been refreshed.");
        };

        setInterval(handler, 30 * 60 * 1_000);
        handler();
    }

    public domain_filter(context: MessageRuleContext<"message", { type: "domain_filter" }>) {
        const { message, rule } = context;
        const invert = rule.mode === "invert";
        const content = message.content.toLowerCase();
        const scanLinksOnly = rule.scan_links_only;

        if (scanLinksOnly) {
            const links = message.content.match(/https?:\/\/[^\s]+/g);

            if (links) {
                const domain = links
                    .map(l => new URL(l).hostname)
                    .find(d => rule.domains.includes(d));

                if (!invert && domain) {
                    return {
                        matched: true,
                        reason: "Message contains a blocked domain.",
                        fields: [
                            {
                                name: "Domain",
                                value: `${spoiler(domain)}`
                            }
                        ]
                    };
                }

                if (invert && !domain) {
                    return {
                        matched: true,
                        reason: "Message does not contain a required domain.",
                        fields: [
                            {
                                name: "Domain",
                                value: `${spoiler(rule.domains[0])}`
                            }
                        ]
                    };
                }
            }
        } else {
            const domain = rule.domains.find(d => content.includes(d));

            if (!invert && domain) {
                return {
                    matched: true,
                    reason: "Message contains a blocked domain.",
                    fields: [
                        {
                            name: "Domain",
                            value: `${spoiler(domain)}`
                        }
                    ]
                };
            }

            if (invert && !domain) {
                return {
                    matched: true,
                    reason: "Message does not contain a required domain.",
                    fields: [
                        {
                            name: "Domain",
                            value: `${spoiler(rule.domains[0])}`
                        }
                    ]
                };
            }
        }

        return {
            matched: false
        };
    }

    public mime_type_filter(context: MessageRuleContext<"message", { type: "mime_type_filter" }>) {
        const { message, rule } = context;
        const invert = rule.mode === "invert";
        const attachments = message.attachments.filter(a => a.contentType);

        if (attachments.size) {
            const attachment = attachments.find(a => rule.data.includes(a.contentType!));

            if (!invert && attachment) {
                return {
                    matched: true,
                    reason: "Message attachments were found to have a blocked MIME type.",
                    fields: [
                        {
                            name: "MIME Type",
                            value: `${spoiler(attachment.contentType!)}`
                        }
                    ]
                };
            }

            if (invert && !attachment) {
                return {
                    matched: true,
                    reason: "Message attachments were not found to have a required MIME type.",
                    fields: [
                        {
                            name: "MIME Type",
                            value: `${spoiler(rule.data[0])}`
                        }
                    ]
                };
            }
        }

        return {
            matched: false
        };
    }

    public file_extension_filter(context: MessageContext<"file_extension_filter">) {
        const { message, rule } = context;
        const invert = rule.mode === "invert";
        const { attachments } = message;

        if (attachments.size) {
            for (const attachment of attachments.values()) {
                const ext = attachment.name.split(".").pop();
                const includes = !ext ? false : rule.data.includes(ext);

                if (includes && !invert) {
                    return {
                        matched: true,
                        reason: "Message attachments were found to have a blocked file extension.",
                        fields: [
                            {
                                name: "Extension",
                                value: `${ext ? spoiler(ext) : "Unavailable"}`
                            }
                        ]
                    };
                } else if (invert && !includes) {
                    return {
                        matched: true,
                        reason: "Message attachments were not found to have a required file extension.",
                        fields: [
                            {
                                name: "Extension",
                                value: `${ext ? spoiler(ext) : "Unavailable"}`
                            }
                        ]
                    };
                }
            }
        }

        return {
            matched: false
        };
    }

    public anti_invite(context: MessageContext<"anti_invite">) {
        const { message, rule } = context;
        const invert = rule.mode === "invert";
        const content = message.content.toLowerCase();
        const invites = content.match(/discord(?:app\.com\/invite|\.gg)\/([a-z0-9-]+)/g);
        const { allow_internal_invites, allowed_invite_codes } = rule;

        if (invites) {
            for (const invite of invites) {
                const code = invite.split("/").pop();
                const isAllowed = code && allowed_invite_codes.includes(code);

                if (isAllowed) {
                    continue;
                }

                const cachedInvite = this.inviteCache.get(`${message.guildId}_${code}`);

                if (cachedInvite) {
                    if (cachedInvite.guild?.id === message.guildId && allow_internal_invites) {
                        continue;
                    }
                }

                if (!invert) {
                    return {
                        matched: true,
                        reason: "Message contains a blocked invite link.",
                        fields: [
                            {
                                name: "Invite",
                                value: `${spoiler(invite)}`
                            }
                        ]
                    };
                }

                if (invert) {
                    return {
                        matched: true,
                        reason: "Message does not contain a required invite link.",
                        fields: [
                            {
                                name: "Invite",
                                value: `${spoiler(invite)}`
                            }
                        ]
                    };
                }
            }
        }

        return {
            matched: false
        };
    }

    public regex_filter(context: MessageContext<"regex_filter">) {
        const { message, rule } = context;
        const invert = rule.mode === "invert";
        const content = message.content.toLowerCase();
        const cached = this.computedRegexCache.get(rule.patterns);
        const patterns =
            cached ??
            rule.patterns.map(
                p =>
                    new RegExp(
                        typeof p === "string" ? p : p[0],
                        typeof p === "string" ? "gim" : p[1]
                    )
            );

        if (cached === undefined) {
            this.computedRegexCache.set(rule.patterns, patterns);
        }

        for (const pattern of patterns) {
            if (pattern.test(content)) {
                if (!invert) {
                    return {
                        matched: true,
                        reason: "Message contains a blocked regex pattern.",
                        fields: [
                            {
                                name: "Pattern",
                                value: `${spoiler(pattern.source)}`
                            }
                        ]
                    };
                }

                if (invert) {
                    return {
                        matched: true,
                        reason: "Message does not contain a required regex pattern.",
                        fields: [
                            {
                                name: "Pattern",
                                value: `${spoiler(pattern.source)}`
                            }
                        ]
                    };
                }
            }
        }

        return {
            matched: false
        };
    }

    public async repeated_text_filter(context: MessageContext<"repeated_text_filter">) {
        const { message, rule } = context;
        const invert = rule.mode === "invert";
        const content = message.content.toLowerCase();
        const repeatedChars = rule.max_repeated_chars;
        const repeatedWords = rule.max_repeated_words;

        const repeatedCharsMatch = await cache.withDeps(
            `automod.block_repeated_text.${message.guildId!}`,
            () => {
                const repeatedCharsRegex = new RegExp(`(.)\\1{${repeatedChars},}`, "gm");
                return content.match(repeatedCharsRegex);
            },
            [repeatedChars]
        );

        if (repeatedCharsMatch) {
            const char = repeatedCharsMatch[0][0];

            if (!invert) {
                return {
                    matched: true,
                    reason: "Message contains repeated character that can be spam.",
                    fields: [
                        {
                            name: "Character",
                            value: `${spoiler(char)}`
                        }
                    ]
                };
            }

            if (invert) {
                return {
                    matched: true,
                    reason: "Message does not contain required repeated character.",
                    fields: [
                        {
                            name: "Character",
                            value: `${spoiler(char)}`
                        }
                    ]
                };
            }
        }

        const repeatedWordsMatch = await cache.withDeps(
            `automod.block_repeated_text.${message.guildId!}`,
            () => {
                const repeatedWordsRegex = new RegExp(
                    `\\b(\\w+)\\s+\\1{${repeatedWords},}\\b`,
                    "gm"
                );
                return content.match(repeatedWordsRegex);
            },
            [repeatedWords]
        );

        if (repeatedWordsMatch) {
            const word = repeatedWordsMatch[0].split(" ")[0];

            if (!invert) {
                return {
                    matched: true,
                    reason: "Message contains repeated words that can be spam.",
                    fields: [
                        {
                            name: "Word",
                            value: `${spoiler(word)}`
                        }
                    ]
                };
            }

            if (invert) {
                return {
                    matched: true,
                    reason: "Message does not contain required repeated words.",
                    fields: [
                        {
                            name: "Word",
                            value: `${spoiler(word)}`
                        }
                    ]
                };
            }
        }

        return {
            matched: false
        };
    }

    public mass_mention_filter(context: MessageContext<"mass_mention_filter">) {
        const { message, rule } = context;
        const invert = rule.mode === "invert";
        const maxMentions = rule.max_mentions;
        const maxUserMentions = rule.max_user_mentions;
        const maxRoleMentions = rule.max_role_mentions;
        const userMentions = message.mentions.users.size;
        const roleMentions = message.mentions.roles.size;

        if (
            userMentions > maxUserMentions ||
            roleMentions > maxRoleMentions ||
            userMentions > maxMentions ||
            roleMentions > maxMentions
        ) {
            if (!invert) {
                return {
                    matched: true,
                    reason: "Message contains too many mentions.",
                    fields: [
                        {
                            name: "User Mentions",
                            value: `${userMentions}`
                        }
                    ]
                };
            }

            if (invert) {
                return {
                    matched: true,
                    reason: "Message does not contain required amount of mentions.",
                    fields: [
                        {
                            name: "User Mentions",
                            value: `${maxUserMentions}`
                        }
                    ]
                };
            }
        }

        return {
            matched: false
        };
    }

    private async checkImageFilter(
        contents: (string | null | undefined)[],
        context: MessageContext<"image_filter">,
        textWords?: string[]
    ): Promise<RuleExecResult> {
        const { rule } = context;
        const invert = rule.mode === "invert";
        const tokens = await cache.withDeps(
            "automod.image_filter.tokens",
            () => rule.tokens.map(t => t.toLowerCase()),
            [rule.tokens]
        );
        const words = await cache.withDeps(
            "automod.image_filter.words",
            () => rule.words.map(w => w.toLowerCase()),
            [rule.words]
        );

        const { word, token } = this.checkWordsAndTokens(contents, words, tokens, textWords);

        if (!invert && (token || word)) {
            return {
                matched: true,
                reason: "Message attachments contain a blocked token or word.",
                fields: [
                    {
                        name: token ? "Token" : "Word",
                        value: `${spoiler(token ?? word!)}`
                    }
                ]
            };
        }

        if (invert && !(token || word)) {
            return {
                matched: true,
                reason: "Message attachments do not contain a required token or word.",
                fields: [
                    {
                        name: !token ? "Token" : "Word",
                        value: `${spoiler(!token ? tokens[0] : words[0])}`
                    }
                ]
            };
        }

        return {
            matched: false
        };
    }

    private checkWordsAndTokens(
        contents: Array<string | null | undefined>,
        words: string[],
        tokens: string[],
        preSplittedWords?: string[]
    ) {
        for (const content of contents) {
            if (!content) {
                continue;
            }

            const token = tokens.find(t => content.includes(t));

            if (token) {
                return { token };
            }

            const splitted = preSplittedWords ?? content.split(/\s+/);
            const word = words.find(w => splitted.includes(w));

            if (word) {
                return { word };
            }
        }

        return {};
    }

    public async image_filter(context: MessageContext<"image_filter">) {
        const { message } = context;
        const { attachments, embeds } = message;

        const urls = new Set<string>();

        if (attachments.size) {
            for (const attachment of attachments.values()) {
                if (!attachment.contentType?.startsWith("image/")) {
                    continue;
                }

                const result = await this.checkImageFilter(
                    [attachment.name.toLowerCase(), attachment.description?.toLowerCase()],
                    context
                );

                if (result.matched) {
                    return result;
                }

                urls.add(attachment.proxyURL ?? attachment.url);
            }
        }

        if (embeds.length) {
            for (const embed of embeds) {
                if (embed.image) {
                    urls.add(embed.image.proxyURL ?? embed.image.url);
                }

                if (embed.thumbnail) {
                    urls.add(embed.thumbnail.proxyURL ?? embed.thumbnail.url);
                }

                if (embed.footer?.iconURL) {
                    urls.add(embed.footer.iconURL);
                }

                if (embed.author?.iconURL) {
                    urls.add(embed.author.iconURL);
                }
            }
        }

        for (const url of urls) {
            const {
                data: { text: actualText, words: textWords }
            } = await this.application.getServiceByName("imageRecognitionService").recognize(url);
            const text = actualText.toLowerCase();
            const result = await this.checkImageFilter(
                [text],
                context,
                textWords.map(t => t.text)
            );

            if (result.matched) {
                return result;
            }
        }

        return {
            matched: false
        };
    }

    public async embed_filter(context: MessageContext<"embed_filter">) {
        const { message, rule } = context;
        const invert = rule.mode === "invert";
        const { embeds } = message;
        const tokens = await cache.withDeps(
            "automod.rules.embed_filter.tokens",
            () => rule.tokens.map(t => t.toLowerCase()),
            [rule.tokens]
        );
        const words = await cache.withDeps(
            "automod.rules.embed_filter.words",
            () => rule.words.map(w => w.toLowerCase()),
            [rule.words]
        );

        for (const embed of embeds) {
            const contents = [
                embed.title?.toLowerCase(),
                embed.description?.toLowerCase(),
                embed.footer?.text?.toLowerCase(),
                embed.author?.name?.toLowerCase(),
                ...embed.fields.map(f => f.name.toLowerCase())
            ];

            const { word, token } = this.checkWordsAndTokens(contents, words, tokens);

            if (!invert && (token || word)) {
                return {
                    matched: true,
                    reason: "Embed contains a blocked token or word.",
                    fields: [
                        {
                            name: token ? "Token" : "Word",
                            value: `${spoiler(token ?? word!)}`
                        }
                    ]
                };
            }

            if (invert && !(token || word)) {
                return {
                    matched: true,
                    reason: "Embed does not contain a required token or word.",
                    fields: [
                        {
                            name: !token ? "Token" : "Word",
                            value: `${spoiler(!token ? tokens[0] : words[0])}`
                        }
                    ]
                };
            }
        }

        return {
            matched: false
        };
    }

    // TODO
    public EXPERIMENTAL_url_crawl(_context: MessageRuleContext) {
        return {
            matched: false
        };
    }

    // TODO
    public EXPERIMENTAL_nsfw_filter(_context: MessageRuleContext) {
        return {
            matched: false
        };
    }

    public async word_filter(
        context: MessageRuleContext<"message", { type: "word_filter" }>
    ): Promise<RuleExecResult> {
        const { message, rule } = context;
        const invert = rule.mode === "invert";
        const content = normalize(message.content, !rule.normalize).toLowerCase();

        if (rule.tokens) {
            const tokens = await cache.withDeps(
                "automod.moderation_rules.word_filter.tokens",
                () => rule.tokens.map(t => t.toLowerCase()),
                [rule.tokens]
            );
            const token = tokens.find(t => content.includes(t));

            if (!invert && token) {
                return {
                    matched: true,
                    reason: "Message contains a blocked token.",
                    fields: [
                        {
                            name: "Token",
                            value: `${spoiler(token)}`
                        }
                    ]
                };
            }

            if (invert && !token) {
                return {
                    matched: true,
                    reason: "Message does not contain a required token.",
                    fields: [
                        {
                            name: "Token",
                            value: `${spoiler(tokens[0])}`
                        }
                    ]
                };
            }
        }

        if (rule.words) {
            const words = await cache.withDeps(
                "automod.moderation_rules.word_filter.words",
                () => rule.words.map(w => w.toLowerCase()),
                [rule.words]
            );
            const contentSplitted = content.split(/\s+/);
            const word = words.find(w => contentSplitted.includes(w));

            if (!invert && word) {
                return {
                    matched: true,
                    reason: "Message contains a blocked word.",
                    fields: [
                        {
                            name: "Word",
                            value: `${spoiler(word)}`
                        }
                    ]
                };
            }

            if (invert && !word) {
                return {
                    matched: true,
                    reason: "Message does not contain a required word.",
                    fields: [
                        {
                            name: "Word",
                            value: `${spoiler(words[0])}`
                        }
                    ]
                };
            }
        }

        return {
            matched: false
        };
    }
}

export default ModerationRuleHandler;
