import { Action } from "@framework/api/decorators/Action";
import { RequireAuth } from "@framework/api/decorators/RequireAuth";
import { Validate } from "@framework/api/decorators/Validate";
import Controller from "@framework/api/http/Controller";
import type Request from "@framework/api/http/Request";
import { Inject } from "@framework/container/Inject";
import { GuildConfigSchema } from "@main/schemas/GuildConfigSchema";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import { ZodError, z } from "zod";

class ConfigController extends Controller {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    private _saveQueueTimeout?: ReturnType<typeof setTimeout>;

    @Action("GET", "/guilds/:id/config")
    @RequireAuth(true)
    public async view(request: Request) {
        const { id } = request.params;
        const guild = this.application.client.guilds.cache.get(id);

        if (!guild) {
            return this.error(404, {
                message: "Guild not found."
            });
        }

        if (!request.user?.guilds.includes(guild.id)) {
            return this.error(403, {
                message: "You do not have permission to view this guild's configuration."
            });
        }

        return this.configManager.getOrDefault(guild.id);
    }

    @Action("PATCH", "/guilds/:id/config")
    @RequireAuth(true)
    @Validate(z.record(z.string(), z.any()))
    public async update(request: Request) {
        const { id } = request.params;
        const guild = this.application.client.guilds.cache.get(id);

        if (!guild) {
            return this.error(404, {
                success: false,
                message: "Guild not found."
            });
        }

        if (!request.user?.guilds.includes(guild.id)) {
            return this.error(403, {
                success: false,
                message: "You do not have permission to update this guild's configuration."
            });
        }

        const config = request.parsedBody;

        if (!config) {
            return this.error(400, {
                success: false,
                message: "No configuration provided."
            });
        }

        if (typeof config !== "object" || !config) {
            return this.error(400, {
                success: false,
                message: "Invalid configuration provided."
            });
        }

        try {
            this.configManager.config[guild.id] = GuildConfigSchema.parse({
                ...this.configManager.config[guild.id],
                ...config
            });
        } catch (error) {
            return this.error(400, {
                success: false,
                message: "Invalid configuration provided.",
                errors: error instanceof ZodError ? error.errors : undefined
            });
        }

        this._saveQueueTimeout ??= setTimeout(() => {
            this.configManager.write({ guild: true, system: false });
            this.configManager.load();
            this._saveQueueTimeout = undefined;
        }, 10_000);

        return {
            success: true,
            message: "Successfully updated the guild configuration."
        };
    }
}

export default ConfigController;
