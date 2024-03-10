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
import { add } from "date-fns";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    Snowflake,
    escapeMarkdown
} from "discord.js";
import jwt from "jsonwebtoken";
import { randomInt } from "node:crypto";
import { request as undiciRequest } from "undici";
import { z } from "zod";
import { Action } from "../../decorators/Action";
import { Validate } from "../../decorators/Validate";
import { logError } from "../../utils/Logger";
import { safeUserFetch } from "../../utils/fetch";
import Controller from "../Controller";
import Request from "../Request";
import Response from "../Response";

export default class AuthController extends Controller {
    private isBannedUser(discordId?: Snowflake | null) {
        if (!discordId) {
            return true;
        }

        if (this.client.commandManager.isBanned(discordId)) {
            return true;
        }

        return false;
    }

    private async genToken(user: User) {
        if (
            !user.token ||
            (user.token && user.tokenExpiresAt && user.tokenExpiresAt.getTime() <= Date.now())
        ) {
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

    @Action("POST", "/auth/recovery_token")
    @Validate(
        z.object({
            username: z.string(),
            code: z.number()
        })
    )
    public async recoveryToken(request: Request) {
        const { username, code } = request.parsedBody ?? {};

        const user = await this.client.prisma.user.findFirst({
            where: {
                username: username.trim(),
                recoveryCode: code.toString().trim()
            }
        });

        if (!user) {
            return new Response({
                status: 403,
                body: {
                    error: "Invalid username or code provided"
                }
            });
        }

        if (this.isBannedUser(user.discordId)) {
            return new Response({
                status: 403,
                body: {
                    error: "Forbidden"
                }
            });
        }

        try {
            jwt.verify(user.recoveryToken!, process.env.JWT_SECRET!, {
                issuer: process.env.JWT_ISSUER ?? "SudoBot",
                subject: "Temporary recovery token",
                complete: true
            });
        } catch (e) {
            logError(e);

            return new Response({
                status: 403,
                body: {
                    error: "Invalid username or code provided"
                }
            });
        }

        if ((user.recoveryTokenExpiresAt?.getTime() ?? Date.now()) <= Date.now()) {
            return new Response({
                status: 400,
                body: {
                    error: "This account recovery request has expired"
                }
            });
        }

        await this.client.prisma.user.updateMany({
            where: {
                id: user.id
            },
            data: {
                recoveryCode: null
            }
        });

        return { success: true, token: user.recoveryToken };
    }

    @Action("POST", "/auth/reset")
    @Validate(
        z.object({
            username: z.string(),
            token: z.string(),
            new_password: z.string()
        })
    )
    public async reset(request: Request) {
        const { username, token, new_password } = request.parsedBody ?? {};

        const user = await this.client.prisma.user.findFirst({
            where: {
                username: username.trim(),
                recoveryToken: token.trim()
            }
        });

        if (!user) {
            return new Response({
                status: 403,
                body: {
                    error: "Invalid username or token provided"
                }
            });
        }

        if (this.isBannedUser(user.discordId)) {
            return new Response({
                status: 403,
                body: {
                    error: "Forbidden"
                }
            });
        }

        try {
            jwt.verify(user.recoveryToken!, process.env.JWT_SECRET!, {
                issuer: process.env.JWT_ISSUER ?? "SudoBot",
                subject: "Temporary recovery token",
                complete: true
            });
        } catch (e) {
            logError(e);

            return new Response({
                status: 403,
                body: {
                    error: "Invalid username or token provided"
                }
            });
        }

        if ((user.recoveryTokenExpiresAt?.getTime() ?? Date.now()) <= Date.now()) {
            return new Response({
                status: 400,
                body: {
                    error: "This account recovery request has expired"
                }
            });
        }

        await this.client.prisma.user.updateMany({
            where: {
                id: user.id
            },
            data: {
                recoveryAttempts: 0,
                recoveryToken: null,
                recoveryTokenExpiresAt: null,
                password: bcrypt.hashSync(new_password, bcrypt.genSaltSync(10)),
                token: null,
                tokenExpiresAt: null,
                recoveryCode: null
            }
        });

        const discordUser = await safeUserFetch(this.client, user.discordId);

        await discordUser
            ?.send({
                embeds: [
                    new EmbedBuilder({
                        author: {
                            name: "Account Successfully Recovered",
                            icon_url: this.client.user?.displayAvatarURL()
                        },
                        color: 0x007bff,
                        description: `Hey ${escapeMarkdown(
                            discordUser.username
                        )},\n\nYour SudoBot Account was recovered and the password was reset. You've been automatically logged out everywhere you were logged in before.\n\nCheers,\nSudoBot Developers`,
                        footer: {
                            text: "Recovery succeeded"
                        }
                    }).setTimestamp()
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel("Log into your account")
                            .setURL(`${process.env.FRONTEND_URL}/login`)
                    )
                ]
            })
            .catch(logError);

        return {
            success: true,
            message: "Successfully completed account recovery"
        };
    }

    @Action("POST", "/auth/recovery")
    @Validate(
        z.object({
            username: z.string()
        })
    )
    public async recovery(request: Request) {
        const { username } = request.parsedBody ?? {};

        const user = await this.client.prisma.user.findFirst({
            where: {
                username: username.trim()
            }
        });

        if (!user) {
            return new Response({
                status: 403,
                body: {
                    error: "Invalid username provided"
                }
            });
        }

        if (this.isBannedUser(user.discordId)) {
            return new Response({
                status: 403,
                body: {
                    error: "Forbidden"
                }
            });
        }

        if (
            user.recoveryToken &&
            user.recoveryTokenExpiresAt &&
            user.recoveryTokenExpiresAt.getTime() > Date.now() &&
            user.recoveryAttempts >= 2
        ) {
            return new Response({
                status: 429,
                body: {
                    error: "This account is already awaiting for recovery"
                }
            });
        }

        const recoveryToken = jwt.sign(
            {
                type: "pwdreset",
                userId: user.id
            },
            process.env.JWT_SECRET!,
            {
                expiresIn: "2 days",
                issuer: process.env.JWT_ISSUER ?? "SudoBot",
                subject: "Temporary recovery token"
            }
        );

        const recoveryTokenExpiresAt = add(new Date(), {
            days: 2
        });

        const recoveryCode = randomInt(10000, 99999).toString();

        await this.client.prisma.user.updateMany({
            where: {
                id: user.id
            },
            data: {
                recoveryAttempts: {
                    increment: 1
                },
                recoveryToken,
                recoveryTokenExpiresAt,
                recoveryCode
            }
        });

        const discordUser = await safeUserFetch(this.client, user.discordId);

        await discordUser
            ?.send({
                embeds: [
                    new EmbedBuilder({
                        author: {
                            name: "Account Recovery Request",
                            icon_url: this.client.user?.displayAvatarURL()
                        },
                        color: 0x007bff,
                        description: `Hey ${escapeMarkdown(
                            discordUser.username
                        )},\n\nWe've received a recovery request for your SudoBot Account. Your recovery code is:\n\n# ${recoveryCode}\n\nAlternatively, click the button at the bottom to reset your account's password.\nIf you haven't requested this, feel free to ignore this DM.\n\nCheers,\nSudoBot Developers`,
                        footer: {
                            text: "This account recovery request will be valid for the next 48 hours"
                        }
                    }).setTimestamp()
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel("Reset your password")
                            .setURL(
                                `${process.env.FRONTEND_URL}/account/reset?u=${encodeURIComponent(
                                    user.username
                                )}&t=${encodeURIComponent(recoveryToken)}`
                            )
                    )
                ]
            })
            .catch(logError);

        return {
            success: true,
            message: "Successfully initiated account recovery"
        };
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

        if (this.isBannedUser(user.discordId)) {
            return new Response({
                status: 403,
                body: {
                    error: "Unable to log in"
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
                    code: parsedBody!.code,
                    grant_type: "authorization_code",
                    redirect_uri: `${process.env.DISCORD_OAUTH2_REDIRECT_URI}`,
                    scope: "identify"
                }).toString(),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            const oauthData = <Record<string, string>>await tokenResponseData.body.json();

            if (oauthData?.error) {
                throw new Error(`${oauthData?.error}: ${oauthData?.error_description}`);
            }

            const userResponse = await undiciRequest("https://discord.com/api/users/@me", {
                headers: {
                    authorization: `${oauthData.token_type} ${oauthData.access_token}`
                }
            });

            const userData = <Record<string, string>>await userResponse.body.json();

            if (userData?.error) {
                throw new Error(`${userData?.error}: ${userData?.error_description}`);
            }

            const avatarURL = `https://cdn.discordapp.com/avatars/${encodeURIComponent(
                userData.id
            )}/${encodeURIComponent(userData.avatar)}.${
                userData.avatar.startsWith("a_") ? "gif" : "webp"
            }?size=512`;

            const user = await this.client.prisma.user.findFirst({
                where: {
                    discordId: userData.id
                }
            });

            if (!user) {
                return new Response({ status: 400, body: "Access denied, no such user found" });
            }

            if (this.isBannedUser(user.discordId)) {
                return new Response({
                    status: 403,
                    body: {
                        error: "Unable to log in"
                    }
                });
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
