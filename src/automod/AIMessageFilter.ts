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

import { Message } from "discord.js";
import { google } from "googleapis";
import Service from "../utils/structures/Service";
import { hasConfig } from "../utils/util";

export default class AIMessageFilter extends Service {
    async scanMessage(message: Message) {
        if (!process.env.PERSPECTIVE_API_TOKEN || !hasConfig(this.client, message.guildId!, "ai_mod")) {
            return;
        }

        if (!message.content || message.content.trim() === "") {
            return;
        }

        const config = this.client.config.props[message.guildId!].ai_mod;

        console.log(config);

        if (!config?.enabled || message.member?.roles.cache.has(this.client.config.props[message.guildId!].mod_role)) {
            return;
        }

        const DISCOVERY_URL = "https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1";

        google
            .discoverAPI(DISCOVERY_URL)
            .then((client) => {
                const analyzeRequest = {
                    comment: {
                        text: message.content,
                    },
                    requestedAttributes: {
                        TOXICITY: {},
                        THREAT: {},
                        SEVERE_TOXICITY: {},
                    },
                };

                (client.comments as any).analyze(
                    {
                        key: process.env.PERSPECTIVE_API_TOKEN,
                        resource: analyzeRequest,
                    },
                    (err: any, response: any) => {
                        if (err) {
                            console.log(err);
                            return;
                        }

                        console.log(JSON.stringify(response.data.attributeScores, null, 4));

                        const threat = response.data.attributeScores.THREAT.summaryScore.value >= (config?.threat ?? 0.8);
                        const toxic = response.data.attributeScores.TOXICITY.summaryScore.value >= (config?.toxicity ?? 0.8);
                        const severeToxic = response.data.attributeScores.SEVERE_TOXICITY.summaryScore.value >= (config?.severe_toxicity ?? 0.8);

                        if (toxic || threat || severeToxic) {
                            message.delete().catch(console.log);
                            this.client.logger.onAIModMessageDelete(message, config, response, {
                                toxic,
                                threat,
                                severeToxic
                            });
                        }
                    }
                );
            })
            .catch((err) => {
                console.log(err);
            });
    }
}
