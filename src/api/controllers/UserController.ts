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
import { z } from "zod";
import { Action } from "../../decorators/Action";
import { RequireAuth } from "../../decorators/RequireAuth";
import { Validate } from "../../decorators/Validate";
import Controller from "../Controller";
import Request from "../Request";
import Response from "../Response";

export default class UserController extends Controller {
    @Action("PATCH", "/users/:id")
    @RequireAuth()
    @Validate(
        z.object({
            name: z.string().optional().nullable(),
            username: z.string().optional(),
            password: z.string().optional()
        })
    )
    async update(request: Request) {
        if (Object.keys(request.parsedBody!).length === 0) {
            return new Response({ status: 422, body: { error: "Nothing to update!" } });
        }

        const id = parseInt(request.params.id);

        if (!id || isNaN(id)) {
            return new Response({ status: 422, body: { error: "Invalid user ID." } });
        }

        // TODO: Allow system admins to edit other users as well
        if (id !== request.userId) {
            return new Response({ status: 403, body: { error: "Cannot modify this user." } });
        }

        const { username, password, name } = request.parsedBody ?? {};
        const { count } = await this.client.prisma.user.updateMany({
            where: {
                id
            },
            data: {
                name: name === null ? null : name && name.length > 0 ? name : undefined,
                username: username && username.length > 0 ? username : undefined,
                password: password && password.length > 0 ? bcrypt.hashSync(password, bcrypt.genSaltSync(10)) : undefined
            }
        });

        if (count === 0) {
            return new Response({ status: 404, body: { error: "No such user found." } });
        }

        return {
            success: true,
            message: "Successfully updated user information."
        };
    }
}
