import { Action } from "@framework/api/decorators/Action";
import { Validate } from "@framework/api/decorators/Validate";
import Controller from "@framework/api/http/Controller";
import type Request from "@framework/api/http/Request";
import Response from "@framework/api/http/Response";
import { Inject } from "@framework/container/Inject";
import type VerificationService from "@main/automod/VerificationService";
import { env } from "@main/env/env";
import undici from "undici";
import { z } from "zod";

class VerificationController extends Controller {
    @Inject("verificationService")
    private readonly verificationService!: VerificationService;

    // FIXME: This is a dummy implementation
    @Action("GET", "/verify")
    public async verify(request: Request) {
        if (!request.query.code) {
            return new Response({ status: 400, body: { error: "A code to verify is required." } });
        }

        const result = await this.application
            .service("verificationService")
            .verifyByCode(
                typeof request.query.code === "string"
                    ? request.query.code
                    : String(request.query.code)
            );

        if (!result) {
            return new Response({ status: 403, body: { error: "Invalid code." } });
        }

        return new Response({
            status: 302,
            headers: {
                Location: `https://discord.com/channels/${encodeURIComponent(result.guildId)}`
            }
        });
    }

    @Action("POST", "/verification/guild")
    @Validate(
        z.object({
            token: z.string()
        })
    )
    public async getVerificationGuild(request: Request) {
        const { token } = request.parsedBody ?? {};
        const entry = await this.verificationService.getVerificationEntry(token);

        if (!entry) {
            return new Response({ status: 403, body: { error: "Invalid token." } });
        }

        const guild = this.application.client.guilds.cache.get(entry.guildId);

        if (!guild) {
            return new Response({ status: 403, body: { error: "Guild not found." } });
        }

        return new Response({
            status: 200,
            body: {
                guild: {
                    id: guild.id,
                    name: guild.name,
                    icon: guild.iconURL({ forceStatic: false }) ?? null
                }
            }
        });
    }

    @Action("POST", "/challenge/discord")
    @Validate(
        z.object({
            code: z.string(),
            token: z.string()
        })
    )
    public async verifyByDiscord(request: Request) {
        const { code, token } = request.parsedBody ?? {};

        try {
            const body = new URLSearchParams({
                client_id: env.CLIENT_ID,
                client_secret: env.CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
                redirect_uri: `${env.FRONTEND_URL}/challenge/discord`,
                scope: "identify guilds"
            }).toString();
            const tokenResponse = await undici.request("https://discord.com/api/oauth2/token", {
                method: "POST",
                body,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            if (tokenResponse.statusCode > 299 || tokenResponse.statusCode < 200) {
                throw new Error(`Failed to get token: ${tokenResponse.statusCode}`);
            }

            const oauthData = await tokenResponse.body.json();

            if (typeof oauthData !== "object" || !oauthData) {
                throw new Error("Invalid token response");
            }

            // FIXME: Remove this
            console.log(oauthData);

            const { access_token, token_type } = oauthData as Record<string, string>;

            const userResponse = await undici.request("https://discord.com/api/users/@me", {
                method: "GET",
                headers: {
                    Authorization: `${token_type} ${access_token}`
                }
            });

            if (userResponse.statusCode > 299 || userResponse.statusCode < 200) {
                throw new Error(`Failed to get user info: ${userResponse.statusCode}`);
            }

            const userData = await userResponse.body.json();

            if (typeof userData !== "object" || !userData) {
                throw new Error("Invalid user response");
            }

            const entry = await this.verificationService.getVerificationEntry(token);

            if (
                !entry ||
                entry.code !== token ||
                entry.userId !== (userData as Record<string, string>).id
            ) {
                return new Response({
                    status: 403,
                    body: { error: "We're unable to verify you, please try again." }
                });
            }

            const result = await this.application
                .service("verificationService")
                .verifyWithEntry(entry);

            if (!result) {
                return new Response({
                    status: 403,
                    body: { error: "We're unable to verify you, please try again." }
                });
            }

            return new Response({
                status: 200,
                body: {
                    message: "You have been verified successfully."
                }
            });
        } catch (error) {
            this.application.logger.error(error);
        }

        return new Response({
            status: 403,
            body: { error: "We're unable to verify your Discord Account." }
        });
    }
}

export default VerificationController;
