/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { User } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { request as undiciRequest } from "undici";
import { z } from "zod";
import { Action } from "../../decorators/Action";
import { Validate } from "../../decorators/Validate";
import { safeUserFetch } from "../../utils/fetch";
import Controller from "../Controller";
import Request from "../Request";
import Response from "../Response";

export default class AuthController extends Controller {
    private async genToken(user: User) {
        if (!user.token || (user.token && user.tokenExpiresAt && user.tokenExpiresAt.getTime() <= Date.now())) {
            user.token = jwt.sign(
                {
                    userId: user.id,
                    random: Math.round(Math.random() * 2000)
                },
                process.env.JWT_SECRET!,
                {
                    expiresIn: "2 days",
                    issuer: process.env.JWT_ISSUER ?? "SudoBot",
                    subject: "Temporary API token for authenticated user"
                }
            );

            user.tokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2);

            await this.client.prisma.user.updateMany({
                where: {
                    id: user.id
                },
                data: {
                    token: user.token,
                    tokenExpiresAt: user.tokenExpiresAt
                }
            });
        }
    }

    @Action("POST", "/auth/login")
    @Validate(
        z.object({
            username: z.string(),
            password: z.string()
        })
    )
    public async login(request: Request) {
        const { username, password } = request.parsedBody ?? {};

        const user = await this.client.prisma.user.findFirst({
            where: {
                username: username.trim()
            }
        });

        if (!user || !bcrypt.compareSync(password.trim(), user.password)) {
            return new Response({
                status: 403,
                body: {
                    error: "Invalid login credentials"
                }
            });
        }

        await this.genToken(user);

        const guilds = [];
        const discordUser = await safeUserFetch(this.client, user.discordId);

        for (const id of user.guilds) {
            const guild = this.client.guilds.cache.get(id);

            if (guild) {
                guilds.push({
                    id: guild.id,
                    name: guild.name,
                    iconURL: guild.iconURL() ?? undefined
                });
            }
        }

        return {
            message: "Login successful",
            user: {
                id: user.id,
                avatarURL: discordUser?.displayAvatarURL(),
                username: user.username,
                name: user.name,
                discordId: user.discordId,
                guilds,
                token: user.token,
                tokenExpiresAt: user.tokenExpiresAt,
                createdAt: user.createdAt
            }
        };
    }

    @Action("POST", "/auth/discord")
    @Validate(
        z.object({
            code: z.string()
        })
    )
    async discord(request: Request) {
        const { parsedBody } = request;

        try {
            const tokenResponseData = await undiciRequest("https://discord.com/api/oauth2/token", {
                method: "POST",
                body: new URLSearchParams({
                    client_id: process.env.CLIENT_ID!,
                    client_secret: process.env.CLIENT_SECRET!,
                    code: parsedBody.code,
                    grant_type: "authorization_code",
                    redirect_uri: `${process.env.DISCORD_OAUTH2_REDIRECT_URI}`,
                    scope: "identify"
                }).toString(),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            const oauthData = <any>await tokenResponseData.body.json();
            console.log(oauthData);

            if (oauthData?.error) {
                throw new Error(`${oauthData?.error}: ${oauthData?.error_description}`);
            }

            const userResponse = await undiciRequest("https://discord.com/api/users/@me", {
                headers: {
                    authorization: `${oauthData.token_type} ${oauthData.access_token}`
                }
            });

            const userData = <any>await userResponse.body.json();

            if (userData?.error) {
                throw new Error(`${userData?.error}: ${userData?.error_description}`);
            }

            console.log(userData);

            const avatarURL = `https://cdn.discordapp.com/avatars/${encodeURIComponent(userData.id)}/${encodeURIComponent(
                userData.avatar
            )}.${userData.avatar.startsWith("a_") ? "gif" : "webp"}?size=512`;

            const user = await this.client.prisma.user.findFirst({
                where: {
                    discordId: userData.id
                }
            });

            if (!user) {
                return new Response({ status: 400, body: "Access denied, no such user found" });
            }

            await this.genToken(user);

            const guilds = [];

            for (const id of user.guilds) {
                const guild = this.client.guilds.cache.get(id);

                if (guild) {
                    guilds.push({
                        id: guild.id,
                        name: guild.name,
                        iconURL: guild.iconURL() ?? undefined
                    });
                }
            }

            return {
                message: "Login successful",
                user: {
                    id: user.id,
                    avatarURL,
                    username: user.username,
                    name: user.name,
                    discordId: user.discordId,
                    guilds,
                    token: user.token,
                    tokenExpiresAt: user.tokenExpiresAt,
                    createdAt: user.createdAt
                }
            };
        } catch (error) {
            console.error(error);
            return new Response({ status: 400, body: "Invalid oauth2 grant code" });
        }
    }
}
