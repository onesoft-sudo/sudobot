import { Inject } from "@framework/container/Inject";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import {
    IPCRequest,
    IPCRequestSchema,
    IPCRequestType
} from "@main/schemas/IPCRequestSchema";
import ExtensionManager from "@main/services/ExtensionManager";
import { systemPrefix } from "@main/utils/utils";
import { Awaitable } from "discord.js";
import { existsSync } from "fs";
import { access, cp, mkdir, rm, symlink } from "fs/promises";
import { createServer, Socket } from "net";
import path from "path";

enum IPCResponseType {
    IPCError = "IPCError",
    ExtensionList = "ExtensionList",
    ExtensionLoadResult = "ExtensionLoadResult"
}

type IPCResponse =
    | {
          type: IPCResponseType.IPCError;
          message: string;
          data?: unknown;
      }
    | {
          type: IPCResponseType.ExtensionList;
          message: string;
          extensions: {
              id: string;
              name: string;
              version: string;
              description?: string;
              author?: string;
              loadedAt: number;
          }[];
      }
    | {
          type: IPCResponseType.ExtensionLoadResult;
          message: string;
          data: {
              id: string;
              name: string;
              version: string;
              description?: string;
              author?: string;
              loadedAt: number;
          };
      };

@Name("interProcessCommunicationService")
class InterProcessCommunicationService extends Service {
    @Inject("extensionManager")
    private readonly extensionManager!: ExtensionManager;

    public initializeSocket() {
        const socketPath =
            process.env.SOCKET_FILE ??
            (process.getuid
                ? `/run/user/${process.getuid()}/sudobot.sock`
                : systemPrefix("sudobot.sock"));

        process.on("exit", () => {
            rm(socketPath, { force: true }).catch(
                this.application.logger.error
            );
        });

        const server = createServer();

        server.on("connection", async socket => {
            this.application.logger.info("IPC connection established");

            let response: IPCResponse;

            try {
                const rawData = await this.readSocketDataAsJSON(socket);
                const result = IPCRequestSchema.safeParse(rawData);

                if (!result.success) {
                    this.application.logger.error(
                        "Invalid IPC data received:",
                        result.error
                    );

                    response = {
                        type: IPCResponseType.IPCError,
                        message: "Error handling request.",
                        data: result.error
                    };
                } else {
                    try {
                        response = await this.handleRequest(result.data);
                    } catch (error) {
                        this.application.logger.error(
                            "Error handling IPC request:",
                            error
                        );

                        response = {
                            type: IPCResponseType.IPCError,
                            message: "Error handling request."
                        };
                    }
                }

                socket.write(JSON.stringify(response), () => socket.end());
            } catch (error) {
                this.application.logger.error("Error reading IPC data:", error);
            }
        });

        server.listen(socketPath, () => {
            this.application.logger.info(
                `IPC socket listening at ${socketPath}`
            );
        });
    }

    private handleRequest(request: IPCRequest): Awaitable<IPCResponse> {
        switch (request.type) {
            case IPCRequestType.ListExtensions:
                return this.listExtensions(request);

            case IPCRequestType.LoadExtension:
                return this.loadExtension(request);

            default:
                return {
                    type: IPCResponseType.IPCError,
                    message: "Invalid request type."
                };
        }
    }

    private async loadExtension(
        request: Extract<IPCRequest, { type: IPCRequestType.LoadExtension }>
    ): Promise<IPCResponse> {
        try {
            await access(request.file);
        } catch (error) {
            return {
                type: IPCResponseType.IPCError,
                message: "Cannot access file.",
                data: error
            };
        }

        const extensionsDirectory = systemPrefix("tmp/extensions");

        if (!existsSync(extensionsDirectory)) {
            await mkdir(path.join(extensionsDirectory, "node_modules"), {
                recursive: true
            });
            await symlink(
                this.application.projectRootPath,
                path.join(extensionsDirectory, "node_modules", "sudobot")
            );

            this.application.logger.debug(
                "Created compiled extensions directory:",
                extensionsDirectory
            );
        }

        const filePath = path.join(
            extensionsDirectory,
            new Date().getTime() +
                (request.file.endsWith(".js") ? ".js" : ".ts")
        );

        await cp(request.file, filePath);
        const { extension, error } =
            await this.extensionManager.loadCompiledExtension(filePath);
        await rm(filePath, { force: true });

        if (error) {
            return {
                type: IPCResponseType.IPCError,
                message: "Error loading extension.",
                data: error
            };
        }

        if (!extension) {
            return {
                type: IPCResponseType.IPCError,
                message: "Extension not found."
            };
        }

        return {
            type: IPCResponseType.ExtensionLoadResult,
            message: "Extension loaded successfully.",
            data: {
                id: extension.id,
                name: extension.name,
                version: extension.version,
                description: extension.meta.description,
                author:
                    typeof extension.meta.package_data.author === "string"
                        ? extension.meta.package_data.author
                        : extension.meta.package_data.author?.name,
                loadedAt: extension.loadedAt
            }
        };
    }

    private listExtensions(_request: IPCRequest): IPCResponse {
        const extensions = this.extensionManager.getInstalledExtensions();

        return {
            type: IPCResponseType.ExtensionList,
            message: "List of extensions",
            extensions: extensions.map(extension => ({
                id: extension.id,
                name: extension.name,
                version: extension.version,
                description: extension.meta.description,
                author:
                    typeof extension.meta.package_data.author === "string"
                        ? extension.meta.package_data.author
                        : extension.meta.package_data.author?.name,
                loadedAt: extension.loadedAt
            }))
        };
    }

    public override boot(): Awaitable<void> {
        return this.initializeSocket();
    }

    private async readSocketData(
        socket: Socket,
        limit = 1024
    ): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let fullData = "",
                magic = "";

            const onTimeout = () => {
                socket.end();
                socket.off("data", onData);
                socket.off("error", onError);
                socket.off("end", onEnd);
            };

            const timeout = setTimeout(onTimeout, 10_000);

            const onData = (data: Buffer) => {
                if (magic.length < 8) {
                    magic += data.subarray(0, 8).toString("utf-8");

                    if (magic.length >= 8) {
                        this.application.logger.info(
                            "Magic number received:",
                            magic
                        );
                    }

                    data = data.subarray(8);
                }

                const message = data.toString("utf-8");
                const magicIndex = message.indexOf(magic);

                fullData += message.slice(
                    0,
                    magicIndex === -1 ? undefined : magicIndex
                );

                if (fullData.length >= limit || magicIndex !== -1) {
                    socket.off("data", onData);
                    socket.off("error", onError);
                    socket.off("end", onEnd);
                    clearTimeout(timeout);
                    resolve(fullData.substring(0, limit));
                }
            };

            const onError = (error: Error) => {
                socket.off("data", onData);
                socket.off("error", onError);
                socket.off("end", onEnd);
                clearTimeout(timeout);
                reject(error);
            };

            const onEnd = () => {
                socket.off("data", onData);
                socket.off("error", onError);
                socket.off("end", onEnd);
                clearTimeout(timeout);
                resolve(fullData.substring(0, limit));
            };

            socket.on("data", onData);
            socket.on("error", onError);
            socket.on("end", onEnd);
            clearTimeout(timeout);
        });
    }

    private async readSocketDataAsJSON(
        socket: Socket,
        limit = 1024
    ): Promise<unknown> {
        const data = await this.readSocketData(socket, limit);
        return JSON.parse(data);
    }
}

export default InterProcessCommunicationService;
