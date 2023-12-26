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

import { NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { Action } from "../../decorators/Action";
import { EnableAdminAccessControl } from "../../decorators/EnableAdminAccessControl";
import { Validate } from "../../decorators/Validate";
import { logError } from "../../utils/logger";
import Controller from "../Controller";
import Request from "../Request";

const ratelimiter = rateLimit({
    max: 2,
    windowMs: 1000 * 60 * 60 * 12,
    validate: false,
    standardHeaders: true,
    legacyHeaders: false
});

export default class ReviewController extends Controller {
    @Action("GET", "/reviews")
    public async index() {
        return await this.client.prisma.review.findMany({
            where: {
                approved: true
            },
            take: 10,
            orderBy: {
                rating: "desc"
            },
            select: {
                aboutReviewer: true,
                id: true,
                content: true,
                approved: true,
                email: false,
                discordId: false,
                rating: true,
                reviewer: true,
                ip: false
            }
        });
    }

    @Action("POST", "/reviews", [(_: any, req: any, res: any, next: NextFunction) => ratelimiter(req, res, next)])
    @Validate(
        z.object({
            rating: z.number().int().min(0).max(5),
            content: z.string(),
            reviewer: z.string().optional(),
            discord_id: z.string().optional(),
            email: z.string().optional(),
            about_reviewer: z.string().optional()
        })
    )
    public async store(request: Request) {
        const {
            rating,
            content,
            about_reviewer: aboutReviewer,
            discord_id: discordId,
            email,
            reviewer
        } = request.parsedBody ?? {};

        await this.client.prisma.review.create({
            data: {
                rating,
                content,
                approved: false,
                aboutReviewer,
                discordId,
                email,
                reviewer,
                ip: request.ip
            }
        });

        return { success: true };
    }

    @Action("PATCH", "/reviews/:id")
    @EnableAdminAccessControl()
    @Validate(
        z.object({
            approved: z.boolean()
        })
    )
    async update(request: Request) {
        const { approved } = request.parsedBody ?? {};

        await this.client.prisma.review
            .update({
                where: {
                    id: parseInt(request.params.id)
                },
                data: {
                    approved
                }
            })
            .catch(logError);

        return {
            status: approved ? "Approved" : "Not approved"
        };
    }
}
