import { Message } from "discord.js";
import { google } from "googleapis";
import Service from "../utils/structures/Service";

export default class AIMessageFilter extends Service {
    async scanMessage(message: Message) {
        if (!process.env.PERSPECTIVE_API_TOKEN) {
            return;
        }

        console.log("here: ai(1)");

        if (!message.content || message.content.trim() === "") {
            return;
        }

        console.log("here: ai(2)");

        const config = this.client.config.props[message.guildId!].ai_mod;

        console.log(config);

        if (!config?.enabled || message.member?.roles.cache.has(this.client.config.props[message.guildId!].mod_role)) {
            return;
        }

        console.log("here: ai(3)");

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
