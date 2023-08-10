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

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Action } from "../../decorators/Action";
import { Validate } from "../../decorators/Validate";
import Controller from "../Controller";
import Request from "../Request";
import Response from "../Response";

export default class AuthController extends Controller {
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
}
