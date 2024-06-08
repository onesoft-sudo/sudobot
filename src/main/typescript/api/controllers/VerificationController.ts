import { Action } from "@framework/api/decorators/Action";
import { Validate } from "@framework/api/decorators/Validate";
import Controller from "@framework/api/http/Controller";
import type Request from "@framework/api/http/Request";
import Response from "@framework/api/http/Response";
import { Inject } from "@framework/container/Inject";
import type VerificationService from "@main/automod/VerificationService";
import { env } from "@main/env/env";
import { VerificationMethod } from "@prisma/client";
import undici from "undici";
import { z } from "zod";

class VerificationController extends Controller {
    @Inject("verificationService")
    private readonly verificationService!: VerificationService;

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
                .verifyWithEntry(entry, {
                    discordId: (userData as Record<string, string>).id,
                    method: VerificationMethod.DISCORD
                });

            if (!result) {
                return new Response({
                    status: 403,
                    body: { error: "We're unable to verify you, please try again." }
                });
            }

            if (result.error === "record_exists") {
                return new Response({
                    status: 403,
                    body: { error: "You cannot use this account to verify." }
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

    @Action("POST", "/challenge/github")
    @Validate(
        z.object({
            code: z.string(),
            token: z.string()
        })
    )
    public async verifyByGitHub(request: Request) {
        const { code, token } = request.parsedBody ?? {};

        if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
            return new Response({
                status: 403,
                body: { error: "GitHub OAuth is not supported." }
            });
        }

        try {
            const body = new URLSearchParams({
                client_id: env.GITHUB_CLIENT_ID,
                client_secret: env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: `${env.FRONTEND_URL}/challenge/github`
            }).toString();

            const tokenResponse = await undici.request(
                "https://github.com/login/oauth/access_token",
                {
                    method: "POST",
                    body,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Accept: "application/json"
                    }
                }
            );

            if (tokenResponse.statusCode > 299 || tokenResponse.statusCode < 200) {
                throw new Error(`Failed to get token: ${tokenResponse.statusCode}`);
            }

            const oauthData = await tokenResponse.body.json();

            if (typeof oauthData !== "object" || !oauthData) {
                throw new Error("Invalid token response");
            }

            const { access_token, token_type, scope } = oauthData as Record<string, string>;

            console.log(oauthData);

            if (!scope.includes("read:user")) {
                return new Response({
                    status: 403,
                    body: { error: "You must authorize the read:user scope." }
                });
            }

            const userResponse = await undici.request("https://api.github.com/user", {
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

            if (!entry || !(userData as Record<string, number>).id || entry.code !== token) {
                return new Response({
                    status: 403,
                    body: { error: "We're unable to verify you, please try again." }
                });
            }

            const result = await this.application
                .service("verificationService")
                .verifyWithEntry(entry, {
                    githubId: (userData as Record<string, number>).id?.toString(),
                    method: VerificationMethod.GITHUB
                });

            if (!result) {
                return new Response({
                    status: 403,
                    body: { error: "We're unable to verify you, please try again." }
                });
            }

            if (result.error === "record_exists") {
                return new Response({
                    status: 403,
                    body: { error: "You cannot use this account to verify." }
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
            body: { error: "We're unable to verify your GitHub Account." }
        });
    }
}

export default VerificationController;
