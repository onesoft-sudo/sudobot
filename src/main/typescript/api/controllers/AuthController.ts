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
import Response from "@framework/api/http/Response";
import { Inject } from "@framework/container/Inject";
import { fetchUser } from "@framework/utils/entities";
import { env } from "@main/env/env";
import { users } from "@main/models/User";
import AuthService from "@main/services/AuthService";
import { APIErrorCode } from "@main/types/APIErrorCode";
import { APIGuild, User } from "discord.js";
import { eq } from "drizzle-orm";
import undici from "undici";
import { z } from "zod";

class AuthController extends Controller {
    @Inject()
    private readonly authService!: AuthService;

    private readonly linkedUserCache = new Map<number, User>();
    private linkedUserCacheTimeout: ReturnType<typeof setTimeout> | null = null;

    @Action("POST", "/login")
    @Validate(
        z.object({
            username: z.string().min(3).max(32),
            password: z.string().min(1).max(64)
        })
    )
    public async login(request: Request) {
        const { username, password } = request.body;

        const result = await this.authService.authenticate({
            username,
            password
        });

        if (!result.success) {
            return new Response({
                status: 400,
                body: {
                    success: false,
                    message: "Invalid credentials",
                    code: APIErrorCode.InvalidCredentials
                }
            });
        }

        const { user } = result;
        const discordUser =
            this.linkedUserCache.get(user.id) ??
            (await fetchUser(this.application.client, user.discordId));

        if (!discordUser) {
            return new Response({
                status: 403,
                body: {
                    success: false,
                    message: "This account is disabled. Please contact an administrator.",
                    code: APIErrorCode.AccountDisabled
                }
            });
        }

        this.linkedUserCache.set(user.id, discordUser);

        if (!this.linkedUserCacheTimeout) {
            this.linkedUserCacheTimeout = setTimeout(
                () => {
                    this.linkedUserCache.clear();
                    this.linkedUserCacheTimeout = null;
                },
                1000 * 60 * 2
            );
        }

        const guilds: APIGuild[] = [];

        for (const guildId of user.guilds) {
            const guild = this.application.client.guilds.cache.get(guildId);

            if (guild) {
                guilds.push(guild.toJSON() as APIGuild);
            }
        }

        return {
            success: true,
            user: {
                id: user.id,
                name: user.name ?? undefined,
                username: user.username,
                discordId: user.discordId,
                avatar: discordUser.displayAvatarURL()
            },
            token: user.token,
            expires: user.tokenExpiresAt?.getTime(),
            guilds
        };
    }

    @Action("POST", "/challenge/auth/discord")
    @Validate(
        z.object({
            code: z.string()
        })
    )
    public async loginWithDiscord(request: Request) {
        const { code } = request.parsedBody ?? ({} as Record<string, string>);

        if (!code) {
            return new Response({
                status: 400,
                body: { error: "Invalid request" }
            });
        }

        try {
            const body = new URLSearchParams({
                client_id: env.CLIENT_ID,
                client_secret: env.CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
                redirect_uri: `${env.FRONTEND_URL}/challenge/auth/discord`,
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

            const userData = (await userResponse.body.json()) as Record<string, string>;

            if (typeof userData !== "object" || !userData) {
                throw new Error("Invalid user response");
            }

            if (userData.error) {
                throw new Error(userData.error);
            }

            const avatarURL = `https://cdn.discordapp.com/avatars/${encodeURIComponent(
                userData.id
            )}/${encodeURIComponent(userData.avatar)}.${
                userData.avatar.startsWith("a_") ? "gif" : "webp"
            }?size=512`;

            const user = await this.application.database.query.users.findFirst({
                where: eq(users.discordId, userData.id)
            });

            if (!user) {
                return new Response({
                    status: 400,
                    body: {
                        error: "We're unable to log you in.",
                        code: APIErrorCode.InvalidCredentials,
                        success: false
                    }
                });
            }

            await this.authService.provisionToken(user);

            const guilds: APIGuild[] = [];

            for (const guildId of user.guilds) {
                const guild = this.application.client.guilds.cache.get(guildId);

                if (guild) {
                    guilds.push(guild.toJSON() as APIGuild);
                }
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    name: user.name ?? undefined,
                    username: user.username,
                    discordId: user.discordId,
                    avatar: avatarURL
                },
                token: user.token,
                expires: user.tokenExpiresAt?.getTime(),
                guilds
            };
        } catch (error) {
            this.application.logger.error(error);
        }

        return new Response({
            status: 403,
            body: {
                error: "We're unable to log you in.",
                code: APIErrorCode.InvalidCredentials,
                success: false
            }
        });
    }
}

export default AuthController;
