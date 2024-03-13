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

import { Response as ExpressResponse, NextFunction } from "express";
import { z } from "zod";
import Client from "../../core/Client";
import { Action } from "../../decorators/Action";
import { EnableGuildAccessControl } from "../../decorators/EnableGuildAccessControl";
import { RequireAuth } from "../../decorators/RequireAuth";
import { Validate } from "../../decorators/Validate";
import { MessageRuleSchema, MessageRuleType } from "../../types/MessageRuleSchema";
import Controller from "../Controller";
import Request from "../Request";
import Response from "../Response";

async function middleware(
    client: Client,
    request: Request,
    response: ExpressResponse,
    next: NextFunction
) {
    if (client.configManager.config[request.params.guild]?.message_rules?.enabled) {
        response.status(400).json({
            error: "Cannot use message rule features when it's not enabled"
        });

        return;
    }

    next();
}

export default class MessageRuleController extends Controller {
    @Action("POST", "/rules/:guild", [middleware])
    @RequireAuth()
    @EnableGuildAccessControl()
    @Validate(
        z.object({
            rule: MessageRuleSchema
        })
    )
    public async update(request: Request) {
        if (Object.keys(request.parsedBody!).length === 0) {
            return new Response({ status: 422, body: { error: "Nothing to update!" } });
        }

        this.client.configManager.config[request.params.guild]?.message_rules?.rules.push(
            request.parsedBody!.rule as unknown as MessageRuleType
        );

        await this.client.configManager.write();
        await this.client.configManager.load();

        return {
            success: true,
            rule: request.parsedBody!.rule
        };
    }
}
