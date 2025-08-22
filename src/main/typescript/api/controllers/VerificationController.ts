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

import { Action } from "@framework/api/decorators/Action";
import { Validate } from "@framework/api/decorators/Validate";
import Controller from "@framework/api/http/Controller";
import type Request from "@framework/api/http/Request";
import { Inject } from "@framework/container/Inject";
import type VerificationService from "@main/automod/VerificationService";
import { getEnvData } from "@main/env/env";
import { AltFingerprintType } from "@main/models/AltFingerprint";
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
                    secret: getEnvData().CF_TURNSTILE_SECRET,
                    response: token,
                    remoteip: ip
                }
            );

            return response.data.success as boolean;
        } catch (error) {
            this.application.logger.error(
                "Failed to verify captcha token: ",
                error
            );
            return false;
        }
    }

    @Action("GET", "/guilds/:guildId/members/:userId/verify")
    public async getMemberVerificationDetails(request: Request) {
        const { guildId, userId } = request.params;
        const { token } = request.query;

        if (!token || typeof token !== "string") {
            return this.response(400, { error: "Missing token." });
        }

        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return this.response(404, { error: "Guild not found." });
        }

        const entry =
            await this.application.database.query.verificationEntries.findFirst(
                {
                    where: and(
                        eq(verificationEntries.guildId, guildId),
                        eq(verificationEntries.token, token),
                        eq(verificationEntries.userId, userId)
                    )
                }
            );

        if (!entry) {
            return this.response(404, {
                error: "Verification entry not found."
            });
        }

        return {
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL()
            }
        };
    }

    @Action("POST", "/guilds/:guildId/members/:userId/discord")
    @Validate(
        z.object({
            discordCode: z.string(),
            token: z.string()
        })
    )
    public async verifyMemberConnectDiscord(request: Request) {
        const { guildId, userId } = request.params;
        const { discordCode, token } = request.parsedBody ?? {};
        const ip = request.ip;

        if (!ip) {
            return this.response(400, { error: "Missing IP address." });
        }

        if (
            await this.verificationService.isProxy(ip, {
                vpn_proxy_check_enabled:
                    !!this.configManager.config[guildId]?.member_verification
                        ?.vpn_proxy_check_enabled
            })
        ) {
            return this.response(400, {
                error: "You seem to be using a VPN or proxy. Please disable it, reload this page and try again."
            });
        }

        const result = await this.verificationService.connectDiscord(
            guildId,
            userId,
            token,
            discordCode
        );

        if (result.error) {
            return this.response(400, { error: result.error });
        }

        return this.response(204, {
            success: true
        });
    }

    @Action("POST", "/guilds/:guildId/members/:userId/verify")
    @Validate(
        z.object({
            captchaToken: z.string(),
            token: z.string(),
            fingerprints: z.array(
                z.tuple([
                    z.number().min(0).max(AltFingerprintType._COUNT),
                    z.string()
                ])
            ),
            frontend_token: z.string(),
            ip: z.string()
        })
    )
    public async verifyMember(request: Request) {
        const { guildId, userId } = request.params;
        const { captchaToken, token, frontend_token, ip } =
            request.parsedBody ?? {};
        const fingerprints =
            request.parsedBody?.fingerprints &&
            Array.isArray(request.parsedBody?.fingerprints)
                ? Object.fromEntries(request.parsedBody?.fingerprints)
                : undefined;

        if (
            !frontend_token ||
            typeof frontend_token !== "string" ||
            frontend_token !== getEnvData().FRONTEND_KEY
        ) {
            return this.response(403, { error: "Invalid request." });
        }

        if (!ip) {
            return this.response(400, { error: "Missing IP address." });
        }

        if (!fingerprints || Object.keys(fingerprints).length === 0) {
            return this.response(400, { error: "Missing fingerprints." });
        }

        const captchaResult = await this.verifyCaptcha(captchaToken, ip);

        if (!captchaResult) {
            return this.response(400, {
                error: "Captcha verification failed."
            });
        }

        const result = await this.verificationService.attemptVerification(
            guildId,
            userId,
            ip,
            token,
            fingerprints as Record<AltFingerprintType, string>
        );

        if (result.error) {
            return this.response(400, { error: result.error });
        }

        return { success: true };
    }
}

export default VerificationController;
