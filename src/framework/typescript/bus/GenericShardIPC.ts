import ShardIPC from "@framework/bus/ShardIPC.js";

class GenericShardIPC extends ShardIPC {
    public override async subscribe() {
        const promises = [];

        for (const shardId of this.application.shards) {
            promises.push(this.application.bus.subscribe(this.getChannelName(shardId)));
        }

        for (const promise of promises) {
            await promise;
        }
    }

    public override async unsubscribe() {
        const promises = [];

        for (const shardId of this.application.shards) {
            promises.push(this.application.bus.unsubscribe(this.getChannelName(shardId)));
        }

        for (const promise of promises) {
            await promise;
        }
    }

    public override async publishTo(shardIds: number | number[], data: unknown) {
        const promises = [];

        for (const shardId of Array.isArray(shardIds) ? shardIds : [shardIds]) {
            promises.push(this.application.bus.publish(this.getChannelName(shardId), data));
        }

        for (const promise of promises) {
            await promise;
        }
    }

    public override async broadcast(data: unknown) {
        const promises = [];

        for (let shardId = 0; shardId < this.application.totalShardCount; shardId++) {
            if (this.application.shards.includes(shardId)) {
                continue;
            }

            promises.push(this.application.bus.publish(this.getChannelName(shardId), data));
        }

        for (const promise of promises) {
            await promise;
        }
    }
}

export default GenericShardIPC;
