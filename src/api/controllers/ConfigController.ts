/*
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

import deepmerge from "deepmerge";
import dot from "dot-object";
import { Response as ExpressResponse } from "express";
import { z } from "zod";
import { Action } from "../../decorators/Action";
import { RequireAuth } from "../../decorators/RequireAuth";
import { Validate } from "../../decorators/Validate";
import { GuildConfigSchema } from "../../types/GuildConfigSchema";
import { logError } from "../../utils/Logger";
import Controller from "../Controller";
import Request from "../Request";
import Response from "../Response";

export default class ConfigController extends Controller {
    guildConfigAccessControl(request: Request, response: ExpressResponse) {
        if (!request.user!.guilds.includes(request.params.id)) {
            response.status(403).json({
                error: "You don't have permission to access this resource."
            });

            return false;
        }

        return true;
    }

    @Action("GET", "/config/:id")
    @RequireAuth()
    public async index(request: Request, response: ExpressResponse) {
        if (!this.guildConfigAccessControl(request, response)) {
            return;
        }

        let commands: string[] | undefined = undefined;

        if (request.query?.commands?.toString()?.toLowerCase() === "true") {
            commands = [];

            for (const [, command] of this.client.commands) {
                if (!commands.includes(command.name)) {
                    commands.push(command.name);
                }
            }
        }

        return {
            config: this.client.configManager.config[request.params.id] ?? null,
            commands
        };
    }

    @Action("PUT", "/config/:id")
    @RequireAuth()
    @Validate(
        z.object({
            data: GuildConfigSchema,
            returnOld: z.boolean().default(false),
            returnNew: z.boolean().default(false)
        })
    )
    public async updatePut(request: Request, response: ExpressResponse) {
        if (!this.guildConfigAccessControl(request, response)) {
            return;
        }

        const oldConfig = this.client.configManager.config[request.params.id];

        if (request.parsedBody) {
            this.client.configManager.config[request.params.id] = deepmerge(
                oldConfig as object,
                request.parsedBody.data ?? {},
                {
                    arrayMerge: (target, source) => {
                        return source;
                    }
                }
            ) as unknown as (typeof this.client.configManager.config)[string];
        }

        await this.client.configManager.write();

        try {
            await this.client.configManager.load();
        } catch (e) {
            logError(e);
            logError("Configuration was corrupted. Restoring the old configuration.");
            this.client.configManager.config[request.params.id] = oldConfig;
            await this.client.configManager.write();
        }

        return {
            success: true,
            old: request.parsedBody?.returnOld ? oldConfig : undefined,
            new: request.parsedBody?.returnNew
                ? this.client.configManager.config[request.params.id]
                : undefined
        };
    }

    @Action("PATCH", "/config/:id")
    @RequireAuth()
    @Validate(
        z.object({
            data: z.record(z.string(), z.any()),
            returnOld: z.boolean().default(false),
            returnNew: z.boolean().default(false)
        })
    )
    public async updatePatch(request: Request, response: ExpressResponse) {
        if (!this.guildConfigAccessControl(request, response)) {
            return;
        }

        const oldConfig = this.client.configManager.config[request.params.id];

        if (request.parsedBody) {
            const { parsedBody } = request;
            const configObject = dot.object(parsedBody.data as unknown as object);
            const result = GuildConfigSchema.safeParse(configObject);

            if (result.success) {
                this.client.configManager.config[request.params.id] = deepmerge(
                    oldConfig as object,
                    result.data
                );
            } else {
                return new Response({
                    status: 400,
                    body: result.error
                });
            }

            await this.client.configManager.write();

            try {
                await this.client.configManager.load();
            } catch (e) {
                logError(e);
                logError("Configuration was corrupted. Restoring the old configuration.");
                this.client.configManager.config[request.params.id] = oldConfig;
                await this.client.configManager.write();
            }

            return {
                success: true,
                old: request.parsedBody?.returnOld ? oldConfig : undefined,
                new: request.parsedBody?.returnNew
                    ? this.client.configManager.config[request.params.id]
                    : undefined
            };
        }
    }
}
