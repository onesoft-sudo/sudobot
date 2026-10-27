import AbstractApplication from "@framework/app/Application.js";
import type MessageBus from "@framework/bus/MessageBus.js";
import type ShardIPC from "@framework/bus/ShardIPC.js";

class Application extends AbstractApplication {
    public override readonly bus: MessageBus = {} as MessageBus;
    public override readonly ipc: ShardIPC = {} as ShardIPC;
}

export default Application;
