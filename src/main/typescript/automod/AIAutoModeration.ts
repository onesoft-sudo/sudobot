/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import { Inject } from "@framework/container/Inject";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { env } from "@main/env/env";
import type { GuildConfig } from "@main/schemas/GuildConfigSchema";
import type PermissionManagerService from "@main/services/PermissionManagerService";
import { safeMemberFetch } from "@main/utils/fetch";
import { GuildMember, Message, TextChannel } from "discord.js";
import undici from "undici";

@Name("aiAutoModeration")
class AIAutoModeration extends Service {
    private readonly cache = new Map<
        `${string}::${string}`,
        {
            timestamp: number;
            score: number;
            attempt: number;
        }
    >();
    private timeout: Timer | null = null;

    @Inject("permissionManager")
    private readonly permissionManagerService!: PermissionManagerService;

    private async analyzeComment(comment: string) {
        if (!env.PERSPECTIVE_API_TOKEN) {
            return null;
        }

        try {
            const url =
                "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=" +
                encodeURIComponent(env.PERSPECTIVE_API_TOKEN);
            const response = await undici.request(url, {
                method: "POST",
                body: JSON.stringify({
                    comment: {
                        text: comment
                    },
                    requestedAttributes: {
                        TOXICITY: {},
                        THREAT: {},
                        SEVERE_TOXICITY: {},
                        IDENTITY_ATTACK: {},
                        INSULT: {},
                        PROFANITY: {},
                        SEXUALLY_EXPLICIT: {},
                        FLIRTATION: {},
                        SPAM: {},
                        OBSCENE: {}
                    },
                    languages: ["en"]
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            });

            return (await response.body.json()) as GoogleResponse;
        } catch (error) {
            this.application.logger.error(error);
            return null;
        }
    }

    public async onMessageCreate(message: Message) {
        if (message.author.bot || message.webhookId || !message.inGuild()) {
            return;
        }

        await this.moderate(message);
    }

    public async onMessageUpdate(oldMessage: Message, newMessage: Message) {
        if (
            newMessage.author.bot ||
            newMessage.webhookId ||
            !newMessage.inGuild() ||
            oldMessage.content === newMessage.content
        ) {
            return;
        }

        await this.moderate(newMessage);
    }

    private configFor(guildId: string) {
        return this.application.service("configManager").config[guildId]?.ai_automod;
    }

    private async shouldModerate(messageOrMember: Message | GuildMember) {
        if (
            (messageOrMember instanceof Message && messageOrMember.author.bot) ||
            (messageOrMember instanceof GuildMember && messageOrMember.user.bot) ||
            !this.configFor(messageOrMember.guild!.id!)?.enabled
        ) {
            return false;
        }

        let finalMember: GuildMember;

        if (messageOrMember instanceof Message) {
            let { member } = messageOrMember;

            if (!member) {
                member = await safeMemberFetch(messageOrMember.guild!, messageOrMember.author.id);
            }

            if (!member) {
                throw new Error("Member not found");
            }

            finalMember = member;
        } else {
            finalMember = messageOrMember;
        }

        return this.permissionManagerService.canAutoModerate(finalMember);
    }

    public async moderate(message: Message<true>) {
        if (!env.PERSPECTIVE_API_TOKEN) {
            return null;
        }

        const config =
            this.application.service("configManager").config[message.guildId]?.ai_automod;

        if (!config?.enabled) {
            return;
        }

        if (!(await this.shouldModerate(message.member ?? message))) {
            this.application.logger.debug(
                "AI moderation is disabled for this user",
                message.author.id
            );

            return false;
        }

        for (const pattern of config.exception_regex_patterns) {
            const regexPattern = typeof pattern === "string" ? pattern : pattern[0];
            const regexFlags = typeof pattern === "string" ? "gi" : pattern[1];
            const regex = new RegExp(regexPattern, regexFlags);

            if (regex.test(message.content)) {
                this.application.logger.debug(
                    "This message matches an exception pattern, ignoring"
                );

                return;
            }
        }

        const key = `${message.guildId}::${message.author.id}` as const;
        let existingRecord = this.cache.get(key);

        if (existingRecord) {
            if (Date.now() - existingRecord.timestamp >= config.evaluation_cache_expires_in) {
                this.cache.delete(key);
                existingRecord = undefined;
            }
        }

        const expiresIn = config.evaluation_cache_expires_in;

        this.timeout ??= setTimeout(() => {
            const now = Date.now();

            for (const [key, value] of this.cache) {
                if (now - value.timestamp >= expiresIn) {
                    this.cache.delete(key);
                }
            }

            this.timeout = null;
        }, 120_000);

        const response = await this.analyzeComment(message.content);

        if (!response) {
            return;
        }

        const result = this.extractResult(response);
        let score = 0;
        let attempt = existingRecord?.attempt ?? 0;

        for (const key in result) {
            score += result[key as keyof typeof result];
        }

        this.application.logger.debug(`Automod score for ${message.author.username}: ${score}`);
        this.application.logger.debug(`Automod score overview for ${message.author.username}`);

        let hasScoreCloserToOne = false;

        for (const key in result) {
            this.application.logger.debug(`  ${key}: ${result[key as keyof typeof result]}`);

            if (result[key as keyof typeof result] >= 0.7) {
                hasScoreCloserToOne = true;
            }
        }

        if (score <= 2.5 && !hasScoreCloserToOne) {
            this.application.logger.debug("Automod score is too low, might be a false positive");
            this.application.logger.debug("Ignoring");
            return;
        }

        attempt++;

        if (!existingRecord) {
            existingRecord = {
                timestamp: Date.now(),
                score,
                attempt
            };

            this.cache.set(key, existingRecord);
            this.application.logger.debug(`Record set for ${message.author.username}`);
        } else {
            existingRecord.score += score;
            existingRecord.attempt = attempt;
        }

        this.application.logger.debug(`Record for ${message.author.username}:`, existingRecord);

        const individualScores = config.max_individual_scores;

        if (
            (attempt >= config.evaluate_after_attempts && config.evaluate_after_attempts !== -1) ||
            existingRecord.score >= config.max_total_score ||
            score >= config.max_single_score ||
            (individualScores &&
                Object.keys(result).some(
                    key =>
                        result[key as keyof typeof result] >=
                        individualScores[key as keyof typeof result]
                ))
        ) {
            existingRecord.timestamp = Date.now();
            await this.evaluate(message, config, existingRecord);
        }
    }

    private async evaluate(
        message: Message<true>,
        config: NonNullable<GuildConfig["ai_automod"]>,
        record: {
            score: number;
            attempt: number;
        }
    ) {
        if (!message.member) {
            this.application.logger.bug("Member not found");
            return;
        }

        this.application.logger.debug(`Automod evaluation for ${message.author.username}`);

        const automatic_actions = config.automatic_actions;

        if (!automatic_actions?.enabled) {
            if (!config.actions?.length) {
                this.application.logger.debug("No actions to take");
                return;
            }

            await this.application
                .service("moderationActionService")
                .takeActions(message.guild, message.member, config.actions, {
                    message
                });
        } else {
            this.application.logger.debug(`Automatic actions for ${message.author.username}`);
            this.application.logger.debug("Stops:", automatic_actions.stops);

            for (const score in automatic_actions.stops) {
                const actions =
                    automatic_actions.stops[score as keyof typeof automatic_actions.stops];

                if (score !== "*" && Number.isNaN(+score)) {
                    this.application.logger.error(`Invalid stop score in config: ${score}`);
                    continue;
                }

                if (score === "*" || record.score >= +score) {
                    this.application.logger.debug(`  Stopping at ${score} with actions:`, actions);

                    await this.application
                        .service("moderationActionService")
                        .takeActions(message.guild, message.member, actions, {
                            message,
                            channel: message.channel as TextChannel
                        });

                    return;
                }
            }
        }
    }

    private extractResult(response: GoogleResponse) {
        const result = {} as GoogleResult;

        for (const [key, value] of Object.entries(response.attributeScores)) {
            result[key.toLowerCase() as keyof typeof result] = value.summaryScore.value;
        }

        return result;
    }
}

type GoogleResult = {
    toxicity: number;
    threat: number;
    severe_toxicity: number;
    identity_attack: number;
    insult: number;
    profanity: number;
    sexually_explicit: number;
    flirtation: number;
    incoherent: number;
    spam: number;
    obscene: number;
    unsubstantial: number;
};

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
        INCOHERENT: {
            summaryScore: {
                value: number;
            };
        };
        SPAM: {
            summaryScore: {
                value: number;
            };
        };
        OBSCENE: {
            summaryScore: {
                value: number;
            };
        };
        UNSUBSTANTIAL: {
            summaryScore: {
                value: number;
            };
        };
    };
};

export default AIAutoModeration;
