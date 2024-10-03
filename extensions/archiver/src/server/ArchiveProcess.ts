import ArchiveService from "src/server/ArchiveService";
import { MessageType } from "../types/MessageType";

if (!process.send) {
    throw new Error("This script must be run as a child process");
}

process.send?.({
    type: MessageType.Ping
});

const service = new ArchiveService();

process.on("message", async serializable => {
    if (
        !serializable ||
        typeof serializable !== "object" ||
        !("type" in serializable) ||
        typeof serializable.type !== "string"
    ) {
        return;
    }

    const message = serializable as Record<string, unknown>;

    switch (message.type) {
        case MessageType.Archive:
            break;
        case MessageType.Ping:
            process.send?.({
                type: MessageType.Acknowledgement
            });
            break;
    }
});

process.on("beforeExit", () => service.close());
