import { Action } from "@framework/api/decorators/Action";
import { Validate } from "@framework/api/decorators/Validate";
import Controller from "@framework/api/http/Controller";
import type Request from "@framework/api/http/Request";
import Response from "@framework/api/http/Response";
import Application from "@framework/app/Application";
import { Inject } from "@framework/container/Inject";
import { env } from "@main/env/env";
import type ShellService from "@main/services/ShellService";
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { z } from "zod";

const CommandPostSchema = z.object({
    command: z.string().min(1),
    args: z.array(z.string()).default([])
});

const middleware = (
    _: Application,
    request: ExpressRequest,
    response: ExpressResponse,
    next: NextFunction
) => {
    if (!request.body) {
        return void response.status(400).json({ message: "Invalid request body." });
    }

    if (!request.headers.authorization || !env.SYSTEM_SHELL_KEY) {
        return void response.status(401).json({ message: "Unauthorized." });
    }

    const [type, token] = request.headers.authorization.split(" ");

    if (type !== "Bearer" || token !== env.SYSTEM_SHELL_KEY) {
        return void response.status(401).json({ message: "Unauthorized." });
    }

    next();
};

class ShellCommandController extends Controller {
    @Inject("shellService")
    private readonly shellService!: ShellService;

    @Action("POST", "/shell/command", [middleware])
    @Validate(CommandPostSchema)
    public async command(request: Request) {
        const { command, args } = request.parsedBody as unknown as z.infer<
            typeof CommandPostSchema
        >;
        const { output, error, code } = await this.shellService.simpleExecute(command, args);

        return new Response({
            status: error ? 400 : 200,
            body: {
                output,
                error,
                code
            }
        });
    }
}

export default ShellCommandController;
