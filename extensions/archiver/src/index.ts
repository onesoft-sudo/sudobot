import Application from "@framework/app/Application";
import EventListener from "@framework/events/EventListener";
import { Logger } from "@framework/log/Logger";
import { Class } from "@framework/types/Utils";
import { sourceFile } from "@framework/utils/utils";
import { Extension } from "@sudobot/extensions/Extension";
import { ChildProcess, fork } from "child_process";
import { Awaitable } from "discord.js";
import "module-alias/register";
import path from "path";
import MessageCreateEventListener from "./events/MessageCreateEventListener";
import { MessageType } from "./types/MessageType";

export default class ArchiverExtension extends Extension {
    private readonly logger = new Logger(`extension:${this.constructor.name}`, true);
    private child?: ChildProcess;

    protected override events(): Awaitable<Class<EventListener, [Application]>[]> {
        return [MessageCreateEventListener];
    }

    public override postConstruct(): void {
        const child = fork(sourceFile(path.resolve(__dirname, "server/ArchiveProcess")));

        child.on("message", serializable => {
            if (
                !serializable ||
                typeof serializable !== "object" ||
                !("type" in serializable) ||
                typeof serializable.type !== "string"
            ) {
                return;
            }

            const message = serializable as Record<string, unknown>;
            this.logger.debug("Server: ", message);

            switch (message.type) {
                case MessageType.Ping:
                    child.send({
                        type: MessageType.Acknowledgement
                    });
                    break;
                case MessageType.Message:
                    this.logger.info("Server: ", message.payload);
                    break;
            }
        });

        child.on("error", error => {
            this.logger.error("Server: ", error);
        });

        child.on("disconnect", () => {
            this.logger.warn("Server process disconnected");
        });

        child.on("spawn", () => {
            this.logger.info("Server process spawned");
        });

        child.on("exit", code => {
            if (code !== 0) {
                this.logger.error(`Unexpected server process exit with code ${code}`);
            } else {
                this.logger.info("Server process exited successfully");
            }
        });

        setTimeout(() => {
            child.send({
                type: MessageType.Ping
            });
        }, 1000);

        this.child = child;
    }

    public override cleanup() {
        if (this.child) {
            this.child.kill("SIGTERM");
        }
    }

    public send(message: Record<string, unknown>) {
        this.child?.send(message);
    }
}
