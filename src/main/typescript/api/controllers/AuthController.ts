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

import { Action } from "@framework/api/decorators/Action";
import { Validate } from "@framework/api/decorators/Validate";
import Controller from "@framework/api/http/Controller";
import type Request from "@framework/api/http/Request";
import Response from "@framework/api/http/Response";
import { Inject } from "@framework/container/Inject";
import { fetchUser } from "@framework/utils/entities";
import AuthService from "@main/services/AuthService";
import { APIErrorCode } from "@main/types/APIErrorCode";
import { APIGuild, User } from "discord.js";
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

        for (const guild of this.application.client.guilds.cache.values()) {
            if (user.guilds.includes(guild.id)) {
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
}

export default AuthController;
