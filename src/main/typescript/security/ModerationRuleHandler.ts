/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import * as cache from "@framework/cache/GlobalStore";
import { Inject } from "@framework/container/Inject";
import { HasApplication } from "@framework/types/HasApplication";
import { normalize } from "@framework/utils/string";
import { AcceptsMessageRuleScopes } from "@main/decorators/AcceptsMessageRuleScopes";
import { AcceptsModerationRuleContextType } from "@main/decorators/AcceptsModerationRuleContextType";
import type ImageRecognitionService from "@main/services/ImageRecognitionService";
import type InviteTrackingService from "@main/services/InviteTrackingService";
import { downloadFile } from "@main/utils/download";
import { request, systemPrefix } from "@main/utils/utils";
import crypto from "crypto";
import { Attachment, hyperlink, inlineCode, spoiler } from "discord.js";
import { readFile, rm } from "fs/promises";
import { env } from "process";
import sharp from "sharp";
import undici from "undici";
import ModerationRuleHandlerContract, {
    MessageRuleScope,
    RuleExecResult,
    type ModerationRuleContext
} from "../contracts/ModerationRuleHandlerContract";

type MessageContext<T> = ModerationRuleContext<"message", { type: T }>;
type ProfileContext<T> = ModerationRuleContext<"profile", { type: T }>;

type GoogleResponse = {
    attributeScores: {
        TOXICITY: {
            summaryScore: {
                value: number;
            };
        };
        THREAT: {
            summaryScore: {
                value: number;
            };
        };
        SEVERE_TOXICITY: {
            summaryScore: {
                value: number;
            };
        };
        IDENTITY_ATTACK: {
            summaryScore: {
                value: number;
            };
        };
        INSULT: {
            summaryScore: {
                value: number;
            };
        };
        PROFANITY: {
            summaryScore: {
                value: number;
            };
        };
        SEXUALLY_EXPLICIT: {
            summaryScore: {
                value: number;
            };
        };
        FLIRTATION: {
            summaryScore: {
                value: number;
            };
        };
    };
};

class ModerationRuleHandler extends HasApplication implements ModerationRuleHandlerContract {
    protected computedRegexCache = new WeakMap<Array<string | [string, string]>, RegExp[]>();

    @Inject("inviteTrackingService")
    private readonly inviteTrackingService!: InviteTrackingService;

    @Inject("imageRecognitionService")
    private readonly imageRecognitionService!: ImageRecognitionService;

    public boot() {
        setInterval(
            () => {
                this.computedRegexCache = new WeakMap();
            },
            1000 * 60 * 60
        );
    }

    @AcceptsMessageRuleScopes(MessageRuleScope.Content)
    public domain_filter(context: ModerationRuleContext<"message", { type: "domain_filter" }>) {
        const { message, rule } = context;
        const invert = rule.mode === "invert";
        const content = message.content.toLowerCase();
        const scanLinksOnly = rule.scan_links_only;

        if (scanLinksOnly) {
            const links = message.content.match(/https?:\/\/\S+/g);

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

    @AcceptsMessageRuleScopes(MessageRuleScope.Attachments)
    public mime_type_filter(
        context: ModerationRuleContext<"message", { type: "mime_type_filter" }>
    ) {
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

    @AcceptsMessageRuleScopes(MessageRuleScope.Attachments)
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

    @AcceptsMessageRuleScopes(MessageRuleScope.Content)
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

                const cachedInvite = this.inviteTrackingService.invites.get(
                    `${message.guildId!}::${code}`
                );

                if (cachedInvite) {
                    if (cachedInvite.guildId === message.guildId && allow_internal_invites) {
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

    @AcceptsMessageRuleScopes(MessageRuleScope.Content)
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

    @AcceptsMessageRuleScopes(MessageRuleScope.Content)
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
            [repeatedChars],
            {
                ttl: 10 * 60 * 1_000
            }
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
            [repeatedWords],
            {
                ttl: 10 * 60 * 1_000
            }
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

    @AcceptsMessageRuleScopes(MessageRuleScope.Content)
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

    @AcceptsMessageRuleScopes(MessageRuleScope.Attachments)
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
            [rule.tokens],
            {
                ttl: 10 * 60 * 1_000
            }
        );
        const words = await cache.withDeps(
            "automod.image_filter.words",
            () => rule.words.map(w => w.toLowerCase()),
            [rule.words],
            {
                ttl: 10 * 60 * 1_000
            }
        );

        const { word, token } = this.checkWordsAndTokens(contents, words, tokens, textWords);

        if (!invert && (token || word)) {
            return {
                matched: true,
                reason: "Message attachments contain a blocked token or word.",
                fields: [
                    {
                        name: token ? "Token" : "Word",
                        value: `${spoiler(token ?? word)}`
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

    @AcceptsMessageRuleScopes(MessageRuleScope.Attachments)
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
            } = await this.application.service("imageRecognitionService").recognize(url);
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

    @AcceptsMessageRuleScopes(MessageRuleScope.Embed)
    public async embed_filter(context: MessageContext<"embed_filter">) {
        const { message, rule } = context;
        const invert = rule.mode === "invert";
        const { embeds } = message;
        const tokens = await cache.withDeps(
            "automod.rules.embed_filter.tokens",
            () => rule.tokens.map(t => t.toLowerCase()),
            [rule.tokens],
            {
                ttl: 10 * 60 * 1_000
            }
        );
        const words = await cache.withDeps(
            "automod.rules.embed_filter.words",
            () => rule.words.map(w => w.toLowerCase()),
            [rule.words],
            {
                ttl: 10 * 60 * 1_000
            }
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
                            value: `${spoiler(token ?? word)}`
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

    @AcceptsMessageRuleScopes(MessageRuleScope.Content)
    public async EXPERIMENTAL_url_crawl(context: MessageContext<"EXPERIMENTAL_url_crawl">) {
        if (context.message.content.trim() === "") {
            return {
                matched: false
            };
        }

        const { excluded_domains_regex, excluded_link_regex, excluded_links, words, tokens } =
            context.rule;
        const matches = context.message.content.matchAll(
            /https?:\/\/([A-Za-z0-9-.]*[A-Za-z0-9-])\S*/gim
        );

        for (const match of matches) {
            const url = match[0].toLowerCase();
            const domain = match[1].toLowerCase();

            if (excluded_links.includes(url)) {
                return {
                    matched: false
                };
            }

            for (const regex of excluded_domains_regex) {
                if (new RegExp(regex, "gim").test(domain)) {
                    return {
                        matched: false
                    };
                }
            }

            for (const regex of excluded_link_regex) {
                if (new RegExp(regex, "gim").test(url)) {
                    return {
                        matched: false
                    };
                }
            }
        }

        for (const match of matches) {
            const url = match[0].toLowerCase();

            const [response, error] = await request({
                url,
                method: "GET",
                transformResponse: r => r
            });

            if (error) {
                this.application.logger.error(error);
                continue;
            }

            if (typeof response?.data !== "string") {
                this.application.logger.warn(
                    "The response returned by the server during URL crawl is invalid"
                );
                continue;
            }

            const lowerCasedData = response.data.toLowerCase();

            for (const token of tokens) {
                if (lowerCasedData.includes(token)) {
                    return {
                        matched: true,
                        reason: "Website contains blocked token(s)",
                        fields: [
                            {
                                name: "Token",
                                value: `||${token}||`
                            },
                            {
                                name: "Method",
                                value: "URL Crawling"
                            }
                        ]
                    };
                }
            }

            const textWords = lowerCasedData.split(/\s+/);

            for (const word of words) {
                if (textWords.includes(word)) {
                    return {
                        matched: true,
                        reason: "Website contains blocked word(s)",
                        fields: [
                            {
                                name: "Word",
                                value: `||${word}||`
                            },
                            {
                                name: "Method",
                                value: "URL Crawling"
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

    @AcceptsMessageRuleScopes(MessageRuleScope.Attachments)
    public async EXPERIMENTAL_nsfw_filter(context: MessageContext<"EXPERIMENTAL_nsfw_filter">) {
        if (context.message.attachments.size === 0) {
            return {
                matched: false
            };
        }

        const { score_thresholds } = context.rule;

        for (const attachment of context.message.attachments.values()) {
            this.application.logger.debug("Scanning attachment", attachment.id);

            if (attachment instanceof Attachment && attachment.contentType?.startsWith("image/")) {
                this.application.logger.debug("Scanning image attachment", attachment.id);

                const [response, error] = await request({
                    url: attachment.proxyURL,
                    method: "GET",
                    responseType: "arraybuffer"
                });

                if (error || !response) {
                    this.application.logger.error(error);
                    continue;
                }

                const imageData = Buffer.from(response.data, "binary");
                const sharpMethodName = attachment.contentType.startsWith("image/gif")
                    ? "gif"
                    : attachment.contentType.startsWith("image/png")
                      ? "png"
                      : attachment.contentType.startsWith("image/jpeg")
                        ? "jpeg"
                        : "unknown";

                if (sharpMethodName === "unknown") {
                    this.application.logger.warn("Unknown image type");
                    continue;
                }

                const sharpInfo = sharp(imageData);
                const sharpMethod = sharpInfo[sharpMethodName].bind(sharpInfo);
                const convertedImageBuffer = await sharpMethod().toBuffer();
                const result = await this.imageRecognitionService.detectNSFW(convertedImageBuffer);
                const isNSFW =
                    result.hentai >= score_thresholds.hentai ||
                    result.porn >= score_thresholds.porn ||
                    result.sexy >= score_thresholds.sexy;

                this.application.logger.debug("NSFW result", result);

                if (isNSFW) {
                    return {
                        matched: true,
                        reason: "NSFW content detected in image",
                        fields: [
                            {
                                name: "Scores",
                                value: `Hentai: ${Math.round(result.hentai * 100)}%\nPorn: ${Math.round(
                                    result.porn * 100
                                )}%\nSexy: ${Math.round(result.sexy * 100)}%\nNeutral: ${Math.round(result.neutral * 100)}%`
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

    private async getFileHashFromURL(url: string) {
        const name = `file_filter_${Math.round(Math.random()) * 100000}_${Date.now()}`;
        const directory = systemPrefix("tmp");

        try {
            const { filePath } = await downloadFile({
                url,
                name,
                path: directory
            });

            const recomputedHash = crypto.createHash("sha512");
            recomputedHash.update(await readFile(filePath));
            const hex = recomputedHash.digest("hex");
            this.application.logger.debug("File hash", hex);
            await rm(filePath);
            return hex;
        } catch (error) {
            this.application.logger.error(error);
            return null;
        }
    }

    @AcceptsMessageRuleScopes(MessageRuleScope.Attachments)
    public async file_filter(
        context: ModerationRuleContext<"message", { type: "file_filter" }>
    ): Promise<RuleExecResult> {
        const { message, rule } = context;
        const invert = rule.mode === "invert";

        for (const attachment of message.attachments.values()) {
            const hash = await this.getFileHashFromURL(attachment.url);

            if (!hash) {
                continue;
            }

            if (
                (invert &&
                    (!(hash in rule.hashes) ||
                        (rule.check_mime_types && rule.hashes[hash] !== attachment.contentType))) ||
                (!invert &&
                    hash in rule.hashes &&
                    (!rule.check_mime_types || rule.hashes[hash] === attachment.contentType))
            ) {
                return {
                    matched: true,
                    reason: "This attachment is not allowed.",
                    fields: [
                        {
                            name: "Attachment",
                            value: `${hyperlink(attachment.name, attachment.proxyURL)}`
                        },
                        {
                            name: "Hash",
                            value: `${inlineCode(hash)}`
                        }
                    ]
                };
            }
        }

        return {
            matched: invert
        };
    }

    @AcceptsMessageRuleScopes(MessageRuleScope.Content)
    public async ai_scan(
        context: ModerationRuleContext<"message", { type: "ai_scan" }>
    ): Promise<RuleExecResult> {
        const { message, rule } = context;
        const invert = rule.mode === "invert";

        if (message.content && env.PERSPECTIVE_API_TOKEN) {
            const payload = {
                comment: {
                    text: message.content
                },
                requestedAttributes: {
                    TOXICITY: {},
                    THREAT: {},
                    SEVERE_TOXICITY: {},
                    IDENTITY_ATTACK: {},
                    INSULT: {},
                    PROFANITY: {},
                    SEXUALLY_EXPLICIT: {},
                    FLIRTATION: {}
                },
                languages: ["en"]
            };

            const result = await this.analyzeComment(payload);

            if (!result) {
                return {
                    matched: false
                };
            }

            this.application.logger.debug("Result", JSON.stringify(result, null, 2));

            const {
                TOXICITY: { summaryScore: toxicity },
                THREAT: { summaryScore: threat },
                SEVERE_TOXICITY: { summaryScore: severeToxicity },
                IDENTITY_ATTACK: { summaryScore: identityAttack },
                INSULT: { summaryScore: insult },
                PROFANITY: { summaryScore: profanity },
                SEXUALLY_EXPLICIT: { summaryScore: sexualExplicit },
                FLIRTATION: { summaryScore: flirtation }
            } = result.attributeScores;

            const {
                toxicity_threshold,
                threat_threshold,
                severe_toxicity_threshold,
                identity_attack_threshold,
                insult_threshold,
                profanity_threshold,
                sexual_explicit_threshold,
                flirtation_threshold
            } = rule;

            if (
                (toxicity.value >= toxicity_threshold ||
                    threat.value >= threat_threshold ||
                    severeToxicity.value >= severe_toxicity_threshold ||
                    identityAttack.value >= identity_attack_threshold ||
                    insult.value >= insult_threshold ||
                    profanity.value >= profanity_threshold ||
                    sexualExplicit.value >= sexual_explicit_threshold ||
                    flirtation.value >= flirtation_threshold) === !invert
            ) {
                let results = "";

                results += `Toxicity: ${Math.round(toxicity.value * 100)}%\n`;
                results += `Threat: ${Math.round(threat.value * 100)}%\n`;
                results += `Severe Toxicity: ${Math.round(severeToxicity.value * 100)}%\n`;
                results += `Identity Attack: ${Math.round(identityAttack.value * 100)}%\n`;
                results += `Insult: ${Math.round(insult.value * 100)}%\n`;
                results += `Profanity: ${Math.round(profanity.value * 100)}%\n`;
                results += `Sexually Explicit: ${Math.round(sexualExplicit.value * 100)}%\n`;
                results += `Flirtation: ${Math.round(flirtation.value * 100)}%\n`;

                return {
                    matched: true,
                    reason: "Message possibly contains inappropriate content.",
                    fields: [
                        {
                            name: "Scan Results",
                            value: results
                        }
                    ]
                };
            }
        }

        return {
            matched: invert
        };
    }

    private async analyzeComment(payload: unknown) {
        if (!env.PERSPECTIVE_API_TOKEN) {
            return null;
        }

        try {
            const url =
                "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=" +
                encodeURIComponent(env.PERSPECTIVE_API_TOKEN);
            const response = await undici.request(url, {
                method: "POST",
                body: JSON.stringify(payload),
                headers: {
                    "Content-Type": "application/json"
                }
            });

            return response.body.json() as Promise<GoogleResponse>;
        } catch (error) {
            this.application.logger.error(error);
            return null;
        }
    }

    @AcceptsMessageRuleScopes(MessageRuleScope.Content)
    public async word_filter(
        context: ModerationRuleContext<"message", { type: "word_filter" }>
    ): Promise<RuleExecResult> {
        const { message, rule } = context;
        const invert = rule.mode === "invert";
        const content = normalize(message.content, !rule.normalize).toLowerCase();

        if (rule.tokens) {
            const tokens = await cache.withDeps(
                "automod.moderation_rules.word_filter.tokens",
                () => rule.tokens.map(t => t.toLowerCase()),
                [rule.tokens],
                {
                    ttl: 10 * 60 * 1_000
                }
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
                [rule.words],
                {
                    ttl: 10 * 60 * 1_000
                }
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

    @AcceptsModerationRuleContextType("profile")
    public profile_filter(context: ProfileContext<"profile_filter">) {
        const { member } = context;
        const stringsToCheck = [member.user.displayName, member.nickname, member.user.username];

        if (member.presence) {
            for (const activity of member.presence.activities.values()) {
                if (activity.state) {
                    stringsToCheck.push(activity.state);
                }

                if (activity.details) {
                    stringsToCheck.push(activity.details);
                }

                if (activity.name) {
                    stringsToCheck.push(activity.name);
                }
            }
        }

        const { tokens, words, normalize, regex_patterns } = context.rule;

        for (let string of stringsToCheck) {
            if (!string) {
                continue;
            }

            if (normalize) {
                string = string.normalize();
            }

            string = string.toLowerCase();

            if (tokens?.length) {
                const token = tokens.find(t => string.includes(t));

                if (token) {
                    return {
                        matched: true,
                        reason: "Profile contains a blocked token.",
                        fields: [
                            {
                                name: "Token",
                                value: `${spoiler(token)}`
                            }
                        ]
                    };
                }
            }

            if (words?.length) {
                const contentSplitted = string.split(/\s+/);
                const word = words.find(w => contentSplitted.includes(w));

                if (word) {
                    return {
                        matched: true,
                        reason: "Profile contains a blocked word.",
                        fields: [
                            {
                                name: "Word",
                                value: `${spoiler(word)}`
                            }
                        ]
                    };
                }
            }

            if (regex_patterns?.length) {
                for (const pattern of regex_patterns) {
                    if (new RegExp(pattern, "gim").test(string)) {
                        return {
                            matched: true,
                            reason: "Profile contains a blocked regex pattern.",
                            fields: [
                                {
                                    name: "Pattern",
                                    value: `${spoiler(pattern)}`
                                }
                            ]
                        };
                    }
                }
            }
        }

        return {
            matched: false
        };
    }
}

export default ModerationRuleHandler;
