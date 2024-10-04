import { ArchiveMessagePayload } from "src/types/ArchiveMessagePayload";
import ArchiveService from "../server/ArchiveService";
import { MessageType } from "../types/MessageType";

if (!process.send) {
    throw new Error("This script must be run as a child process");
}

process.send?.({
    type: MessageType.Ping
});

async function main() {
    const service = await ArchiveService.create();

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
                await service.archive(message as ArchiveMessagePayload);
                break;
            case MessageType.Ping:
                process.send?.({
                    type: MessageType.Acknowledgement
                });
                break;
        }
    });

    process.on("beforeExit", () => service.close());
}

main().catch(console.error);
