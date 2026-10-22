import { HasApplication } from "@framework/types/HasApplication.js";

abstract class ShardIPC extends HasApplication {
    public getChannelName(shardId: number) {
        return `shard-ipc-${shardId}`;
    }

    public abstract subscribe(): Promise<void>;
    public abstract unsubscribe(): Promise<void>;
    public abstract publishTo(shardIds: number | number[], data: unknown): Promise<void>;
    public abstract broadcast(data: unknown): Promise<void>;
}

export default ShardIPC;
