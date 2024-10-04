import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import type ExtensionManager from "@sudobot/services/ExtensionManager";
import { Message } from "discord.js";
import { id } from "../../extension.json";
import type ArchiverExtension from "../index";
import { MessageType } from "../types/MessageType";

class MessageCreateEventListener extends EventListener<Events.MessageCreate> {
    public override readonly name = Events.MessageCreate;

    @Inject("extensionManager")
    private readonly extensionManager!: ExtensionManager;

    private extension: ArchiverExtension | null = null;

    public async execute(message: Message): Promise<void> {
        if (!message.inGuild()) {
            return;
        }

        console.log(`[${message.author.username}]: ${message.content}`);

        if (!this.extension) {
            const extension =
                this.extensionManager.getInstalledExtensionById<ArchiverExtension>(id);

            if (!extension) {
                throw new Error(`Extension with id ${id} not found`);
            }

            this.extension = extension;
        }

        this.extension.send({
            type: MessageType.Archive,
            message: message.toJSON(),
            author: message.author.toJSON(),
            guild: message.guild?.toJSON()
        });
    }
}

export default MessageCreateEventListener;
