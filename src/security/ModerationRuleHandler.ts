import { spoiler } from "discord.js";
import ModerationRuleHandlerContract, {
    MessageRuleContext,
    RuleExecResult
} from "../contracts/ModerationRuleHandlerContract";
import { HasApplication } from "../framework/types/HasApplication";

// FIXME: This class is not complete and is only a placeholder for the actual implementation.

type MessageContext<T> = MessageRuleContext<"message", { type: T }>;

class ModerationRuleHandler extends HasApplication implements ModerationRuleHandlerContract {
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

    public anti_invite(_context: MessageRuleContext) {
        return {
            matched: false
        };
    }

    public regex_filter(_context: MessageRuleContext) {
        return {
            matched: false
        };
    }

    public block_repeated_text(_context: MessageRuleContext) {
        return {
            matched: false
        };
    }

    public block_mass_mention(_context: MessageRuleContext) {
        return {
            matched: false
        };
    }

    public regex_must_match(_context: MessageRuleContext) {
        return {
            matched: false
        };
    }

    public image(_context: MessageRuleContext) {
        return {
            matched: false
        };
    }

    public embed(_context: MessageRuleContext) {
        return {
            matched: false
        };
    }

    public EXPERIMENTAL_url_crawl(_context: MessageRuleContext) {
        return {
            matched: false
        };
    }

    public EXPERIMENTAL_nsfw_filter(_context: MessageRuleContext) {
        return {
            matched: false
        };
    }

    public word_filter(
        context: MessageRuleContext<"message", { type: "word_filter" }>
    ): RuleExecResult {
        const { message, rule } = context;
        const invert = rule.mode === "invert";

        const content = (
            rule.normalize ? message.content.replace(/[\u0300-\u036f]/g, "") : message.content
        ).toLowerCase();

        if (rule.tokens) {
            const tokens = rule.tokens.map(t => t.toLowerCase());
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
            const words = rule.words.map(w => w.toLowerCase());
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
