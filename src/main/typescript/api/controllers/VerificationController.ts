import { Action } from "@framework/api/decorators/Action";
import { Validate } from "@framework/api/decorators/Validate";
import Controller from "@framework/api/http/Controller";
import type Request from "@framework/api/http/Request";
import { Inject } from "@framework/container/Inject";
import type VerificationService from "@main/automod/VerificationService";
import { env } from "@main/env/env";
import { verificationEntries } from "@main/models/VerificationEntry";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import { getAxiosClient } from "@main/utils/axios";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

class VerificationController extends Controller {
    @Inject("verificationService")
    private readonly verificationService!: VerificationService;

    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    private async verifyCaptcha(token: string, ip: string) {
        try {
            const response = await getAxiosClient().post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                {
                    secret: env.CF_TURNSTILE_SECRET,
                    response: token,
                    remoteip: ip
                }
            );

            return response.data.success as boolean;
        } catch (error) {
            this.application.logger.error("Failed to verify captcha token: ", error);
            return false;
        }
    }

    @Action("GET", "/guilds/:guildId/members/:userId/verify")
    public async getMemberVerificationDetails(request: Request) {
        const { guildId, userId } = request.params;

        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return this.error(404, { error: "Guild not found." });
        }

        const entry = await this.application.database.query.verificationEntries.findFirst({
            where: and(
                eq(verificationEntries.guildId, guildId),
                eq(verificationEntries.userId, userId)
            )
        });

        if (!entry) {
            return this.error(404, { error: "Verification entry not found." });
        }

        return {
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.icon
            }
        };
    }

    @Action("POST", "/guilds/:guildId/members/:userId/verify")
    @Validate(
        z.object({
            captchaToken: z.string(),
            token: z.string()
        })
    )
    public async verifyMember(request: Request) {
        const { guildId, userId } = request.params;
        const { captchaToken, token } = request.parsedBody ?? {};
        const ip = request.ip;

        if (!ip) {
            return this.error(400, { error: "Missing IP address." });
        }

        const captchaResult = await this.verifyCaptcha(captchaToken, ip);

        if (!captchaResult) {
            return this.error(400, {
                error: "We're unable to verify whether you're human or not: Captcha verification failed."
            });
        }

        const result = await this.verificationService.attemptVerification(
            guildId,
            userId,
            ip,
            token
        );

        if (result.error) {
            return this.error(400, { error: result.error });
        }

        return { success: true };
    }
}

export default VerificationController;
